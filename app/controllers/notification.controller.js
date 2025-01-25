const Notification = require("../models/notification.model");

const notification = {};

notification.create = async (req, res) => {
	try {
		const bodyData = req.body;

		const createNotification = await Notification.create(bodyData);

		const fetchNotification = await Notification.findOne({ _id: createNotification._id })
			.populate("receiverId", {
				name: 1,
				profileImage: 1,
			})
			.populate("senderId", {
				name: 1,
				profileImage: 1,
			});

		return res.status(200).send({ status: true, msg: "Notification created !!", data: fetchNotification });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

notification.get = async (req, res) => {
	try {
		const fetchAllNotification = await Notification.find({ receiverId: req.params._id })
			.populate("receiverId", {
				name: 1,
				profileImage: 1,
			})
			.populate("senderId", {
				name: 1,
				profileImage: 1,
			});

		return res.status(200).send({ status: true, msg: "Fetch all notification !!", data: fetchAllNotification });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

notification.seen = async (req, res) => {
	try {
		await Notification.updateMany({ receiverId: req.params._id }, { $set: { isSeen: true } });
		const fetchAllNotification = await Notification.find({ receiverId: req.params._id })
			.sort({ createdAt: -1 })
			.populate("receiverId", {
				name: 1,
				profileImage: 1,
			})
			.populate("senderId", {
				name: 1,
				profileImage: 1,
			});

		const count = await Notification.countDocuments({ receiverId: req.params._id });

		return res.status(200).send({ status: true, msg: "All notification seen !!", count, data: fetchAllNotification });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

notification.delete = async (req, res) => {
	try {
		const deleteData = await Notification.deleteMany({ receiverId: req.params._id });

		const fetchAllNotification = await Notification.find({ receiverId: req.params._id })
			.sort({ createdAt: -1 })
			.populate("receiverId", {
				name: 1,
				profileImage: 1,
			})
			.populate("senderId", {
				name: 1,
				profileImage: 1,
			});

		return res
			.status(200)
			.send({
				status: true,
				msg: "All notification clear !!",
				deletedCount: deleteData.deletedCount,
				data: fetchAllNotification,
			});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

module.exports = notification;
