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
		currentDate.setDate(currentDate.getDate() + 1);
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

module.exports = service;
