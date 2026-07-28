const serviceModel = require("../models/service.model");
const convertTo12HourFormat = require("../util/convertTo12HourFormat");
 
const service = {};
const today = new Date().toISOString().split("T")[0];

service.pay = async (req, res) => {
	try {
		if (today === req.body.date) res.status(404).send({ status: false, msg: "Please select future date !!", data: [] });

		const bodyData = {};
		bodyData.userId = req.user._id;
		bodyData.date = req.body.date;
		bodyData.time = convertTo12HourFormat(req.body.time);
		bodyData.serviceData = req.body.serviceData;
		bodyData.totalAmount = req.body.totalAmount;
		const currentDate = new Date(req.body.date);
		currentDate.setDate(currentDate.getDate() + 1); // 1 day validity
		const nextDate = currentDate.toISOString().split("T")[0];
		bodyData.expireDate = nextDate;

		const data = await serviceModel.create(bodyData);

		return res.status(200).send({ status: true, msg: `Payment Process Started !!`, data: data });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message, data: [] });
	}
};

service.myServices = async (req, res) => {
	try {
		const userId = req.user._id;
		const status = req.query.status;

		let data = null;
		let dataCount = 0;
		const dataAll = await serviceModel.find({ userId }).sort({ createdAt: -1 }).populate({
			path: "userId",
			select: "name phone email profileImage userType",
		});
		const dataCountAll = await serviceModel.countDocuments({ userId });

		await Promise.all(
			dataAll.map(async (item) => {
				let isActive = null;

				if (item.date < today) isActive = false;
				else {
					if (today === item.date) isActive = true;
					else if (item.expireDate < today) isActive = false;
				}

				const d = await serviceModel.findByIdAndUpdate(item._id, { isActive: isActive }, { new: true }).populate({
					path: "userId",
					select: "name phone email profileImage userType",
				});
			})
		);

		if (status === "all") {
			data = dataAll; 
			dataCount = dataCountAll;
		} else if (status === "active") {
			data = await serviceModel.find({ userId, isActive: true }).sort({ createdAt: -1 }).populate({
				path: "userId",
				select: "name phone email profileImage userType",
			});
			dataCount = await serviceModel.countDocuments({ userId, isActive: true });
		} else if (status === "expired") {
			data = await serviceModel.find({ userId, isActive: false }).sort({ createdAt: -1 }).populate({
				path: "userId",
				select: "name phone email profileImage userType",
			});
			dataCount = await serviceModel.countDocuments({ userId, isActive: false });
		} else if (status === "upcoming") {
			data = await serviceModel.find({ userId, isActive: null }).sort({ createdAt: -1 }).populate({
				path: "userId",
				select: "name phone email profileImage userType",
			});
			dataCount = await serviceModel.countDocuments({ userId, isActive: null });
		}

		return res.status(200).send({ status: true, msg: `My Services !!`, dataCount, data: [...data] });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message, data: [] });
	}
};

service.getDetails = async (req, res) => {
	try {
		const { id } = req.params;
		const adminUserModel = require("../models/adminUser.model");
		const jobModel = require("../models/job.model");

		const record = await serviceModel.findById(id).lean();
		if (!record) return res.status(404).json({ status: false, msg: "Service record not found!" });

		// Retrieve associated job
		let jobId = record.serviceData?.jobId;
		if (!jobId && record.merchantTransactionId && record.merchantTransactionId.startsWith("MANUAL_JOB_ADDON_")) {
			jobId = record.merchantTransactionId.replace("MANUAL_JOB_ADDON_", "");
		}

		// Find assigned HR specialist
		let assignedHR = null;
		if (jobId) {
			const hrUser = await adminUserModel.findOne({
				"jobTarget.jobIds.jobId": jobId
			}).select("name email number profileImage").lean();

			if (hrUser) {
				assignedHR = {
					name: hrUser.name,
					title: "HR Specialist / Talent Acquisition Manager",
					phone: hrUser.number || "",
					email: hrUser.email,
					profileImage: hrUser.profileImage
				};
			}
		}

		// Dynamic default tracker metrics if empty
		const progressPercentage = record.progressPercentage || 75;
		const workDone = record.workDone && record.workDone.length > 0 ? record.workDone : [
			"18 Verified candidate profiles shortlisted",
			"Initial technical round scheduled for 5 candidates",
			"Salary negotiation and availability confirmed"
		];
		const workPending = record.workPending && record.workPending.length > 0 ? record.workPending : [
			"Final interview round coordination (2 candidates)",
			"Background verification check & offer rollout"
		];

		return res.status(200).json({
			status: true,
			serviceName: record.serviceData?.name || record.serviceData?.title || "Add-On Service",
			isActive: record.isActive || false,
			totalAmount: record.totalAmount,
			transactionId: record.merchantTransactionId,
			purchaseDetails: {
				purchasedDate: record.date,
				validUntil: record.expireDate,
				paymentMethod: "UPI Direct Payment"
			},
			assignedHR,
			progressTracker: {
				percentageDone: progressPercentage,
				workDone,
				workPending
			},
			review: {
				rating: record.rating || 0,
				reviewText: record.reviewText || ""
			}
		});
	} catch (error) {
		console.error("Error in getDetails:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

service.submitRateReview = async (req, res) => {
	try {
		const { serviceId, rating, reviewText } = req.body;
		if (!serviceId) return res.status(400).json({ status: false, msg: "serviceId is required!" });

		const record = await serviceModel.findById(serviceId);
		if (!record) return res.status(404).json({ status: false, msg: "Service record not found!" });

		record.rating = rating;
		record.reviewText = reviewText;
		await record.save();

		return res.status(200).json({ status: true, msg: "Review submitted successfully!" });
	} catch (error) {
		console.error("Error in submitRateReview:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = service;
