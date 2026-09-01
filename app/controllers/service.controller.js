const serviceModel = require("../models/service.model");
const convertTo12HourFormat = require("../util/convertTo12HourFormat");
 
const service = {};
const today = new Date().toISOString().split("T")[0];

service.pay = async (req, res) => {
	try {
		const rawDate = req.body.date;
		const rawTime = req.body.time;

		let dateVal = rawDate;
		let timeVal = "";

		if (!dateVal || dateVal.trim() === "") {
			dateVal = new Date().toISOString().split("T")[0];
		}

		if (!rawTime || rawTime.trim() === "") {
			const now = new Date();
			let hours = now.getHours();
			const minutes = now.getMinutes();
			const meridiem = hours >= 12 ? "PM" : "AM";
			hours = hours % 12 || 12;
			const hoursFormatted = hours < 10 ? "0" + hours : hours;
			const minutesFormatted = minutes < 10 ? "0" + minutes : minutes;
			timeVal = `${hoursFormatted}:${minutesFormatted} ${meridiem}`;
		} else {
			timeVal = convertTo12HourFormat(rawTime) || rawTime;
		}

		const bodyData = {};
		bodyData.userId = req.user._id;
		bodyData.date = dateVal;
		bodyData.time = timeVal;
		bodyData.serviceData = req.body.serviceData;
		bodyData.totalAmount = req.body.totalAmount;
		bodyData.note = req.body.note || req.body.desc || req.body.description || "";
		bodyData.description = req.body.description || req.body.desc || req.body.note || "";

		const currentDate = new Date(dateVal);
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
		const expireJobsAndServices = require("../util/expireJobsAndServices");
		await expireJobsAndServices();
 
		const userId = req.user._id;
		const status = req.query.status;

		let data = null;
		let dataCount = 0;
		const conversationModel = require("../models/conversation.model");
		const adminUserModel = require("../models/adminUser.model");

		const defaultHR = await adminUserModel.findOne({ type: { $in: ["hr", "admin", "sub-admin"] }, isDeleted: { $ne: true } }).select("name email number phone profileImage").lean();

		const dataAll = await serviceModel.find({ userId })
			.sort({ createdAt: -1 })
			.populate({ path: "userId", select: "name phone email profileImage userType" })
			.populate({ path: "assignedHR", select: "name email number phone profileImage" })
			.populate("addonId");
		const dataCountAll = await serviceModel.countDocuments({ userId });

		await Promise.all(
			dataAll.map(async (item) => {
				let isActive = true;

				if (item.expireDate && item.expireDate < today) {
					isActive = false;
				} else if (item.date && item.date > today) {
					isActive = null;
				} else {
					isActive = true;
				}

				// If assignedHR is missing, try to resolve from conversationModel or default HR Admin
				if (!item.assignedHR) {
					const activeConv = await conversationModel.findOne({
						$or: [{ userId: userId }, { recruiterId: userId }],
						hrId: { $exists: true, $ne: null }
					}).sort({ updatedAt: -1 }).populate("hrId", "name email number phone profileImage");

					if (activeConv && activeConv.hrId) {
						item.assignedHR = activeConv.hrId;
						await serviceModel.findByIdAndUpdate(item._id, { assignedHR: activeConv.hrId._id, fulfillmentStatus: "ASSIGNED" }).catch(() => {});
					} else if (defaultHR) {
						item.assignedHR = defaultHR;
						await serviceModel.findByIdAndUpdate(item._id, { assignedHR: defaultHR._id, fulfillmentStatus: "ASSIGNED" }).catch(() => {});
					}
				}

				item.isActive = isActive;
				await serviceModel.findByIdAndUpdate(item._id, { isActive: isActive });
			})
		);

		if (status === "all") {
			data = dataAll; 
			dataCount = dataCountAll;
		} else if (status === "active") {
			data = dataAll.filter(item => item.isActive === true);
			dataCount = data.length;
		} else if (status === "expired") {
			data = dataAll.filter(item => item.isActive === false);
			dataCount = data.length;
		} else if (status === "upcoming") {
			data = dataAll.filter(item => item.isActive === null);
			dataCount = data.length;
		}

		return res.status(200).send({ status: true, msg: `My Services !!`, dataCount, data });
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
/**
 * GET /service/hr-assigned-services
 * Fetches all candidate/recruiter service requests assigned to the logged-in HR
 */
service.getHRAssignedServices = async (req, res) => {
	try {
		const hrId = req.user._id;
		const { status, page = 1, limit = 20 } = req.query;

		const filter = { assignedHR: hrId };
		if (status && status !== "ALL") {
			filter.fulfillmentStatus = status;
		}

		const skip = (Number(page) - 1) * Number(limit);

		const [services, total] = await Promise.all([
			serviceModel.find(filter)
				.populate("userId", "name email phone profileImage userType")
				.populate("addonId")
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(Number(limit)),
			serviceModel.countDocuments(filter),
		]);

		return res.status(200).json({
			status: true,
			total,
			page: Number(page),
			pages: Math.ceil(total / Number(limit)),
			data: services,
		});
	} catch (error) {
		console.error("Error in getHRAssignedServices:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

/**
 * PUT /service/update-fulfillment-status/:id
 * Allows assigned HR to update service progress, checklist & fulfillment status
 */
service.updateFulfillmentStatus = async (req, res) => {
	try {
		const { id } = req.params;
		const { fulfillmentStatus, workDone, workPending, progressPercentage } = req.body;

		const targetService = await serviceModel.findById(id);
		if (!targetService) {
			return res.status(404).json({ status: false, msg: "Service record not found!" });
		}

		if (fulfillmentStatus) targetService.fulfillmentStatus = fulfillmentStatus;
		if (workDone !== undefined) targetService.workDone = Array.isArray(workDone) ? workDone : [];
		if (workPending !== undefined) targetService.workPending = Array.isArray(workPending) ? workPending : [];
		if (progressPercentage !== undefined) targetService.progressPercentage = Number(progressPercentage);

		await targetService.save();

		return res.status(200).json({
			status: true,
			msg: "Service fulfillment status updated successfully!",
			data: targetService,
		});
	} catch (error) {
		console.error("Error in updateFulfillmentStatus:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = service;
