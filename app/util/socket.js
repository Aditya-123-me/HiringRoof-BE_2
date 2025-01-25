const adminUserModel = require("../models/adminUser.model");
const chatModel = require("../models/chat.model");
const Notification = require("../models/notification.model");
const userModel = require("../models/user.model");

async function populate(notification) {
	try {
		let sender;
		if (notification.senderType === "user")
			sender = await userModel.findById(notification.senderId).select("name profileImage");
		else if (notification.senderType === "adminUser")
			sender = await adminUserModel.findById(notification.senderId).select("name profileImage");

		let receiver;
		if (notification.receiverType === "user")
			receiver = await userModel.findById(notification.receiverId).select("name profileImage");
		else if (notification.receiverType === "adminUser")
			receiver = await adminUserModel.findById(notification.receiverId).select("name profileImage");

		notification.senderId = sender;
		notification.receiverId = receiver;
		return notification;
	} catch (error) {
		console.error("Error populating sender:", error);
	}
}

module.exports = (io) => {
	io.on("connection", (socket) => {
		console.log("A user connected");

		socket.on("notificationHistory", async (userId) => {
			// const fetchNotifications = await Notification.find({ receiverId: userId })
			// 	.populate("receiverId", {
			// 		name: 1,
			// 		profileImage: 1,
			// 	})
			// 	.populate("senderId", {
			// 		name: 1,
			// 		profileImage: 1,
			// 	})
			// 	.sort({ createdAt: -1 })
			// 	.lean();

			const fetchNotifications = await Notification.find({ receiverId: userId }).sort({ createdAt: -1 }).lean();
			let fn = [];
			await Promise.all(fetchNotifications.map(async (data) => fn.push(await populate(data))));

			socket.emit(`notificationHistory_${userId}`, fn);
		});

		socket.on("notification", async (data) => {
			const createNotification = await Notification.create(data);

			const fetchNotification = await Notification.findOne({ _id: createNotification._id })
				.populate("receiverId", {
					name: 1,
					profileImage: 1,
				})
				.populate("senderId", {
					name: 1,
					profileImage: 1,
				})
				.sort({ createdAt: -1 });

			socket.broadcast.emit(`notifications_${fetchNotification.receiverId._id}`, fetchNotification);
		});

		socket.on("joinRoom", async (roomId) => {
			socket.join(roomId);

			const history = await chatModel
				.find({ roomId })
				.sort({ createdAt: 1 })
				.populate({ path: "senderId", select: "name profileImage" });

			socket.emit("chatHistory", history);
		});

		socket.on("leaveRoom", (room) => {
			socket.leave(room);
		});

		socket.on("chat", async (chatData) => {
			const chat = await chatModel.create(chatData);
			chatModel
				.findOne({ _id: chat._id })
				.populate({ path: "senderId", select: "name profileImage" })
				.then((data) => {
					socket.emit(`chat_received_${chatData.roomId}`, data);
					socket.to(chatData.roomId).emit(`chat_${chatData.roomId}`, data);
				})
				.catch((e) => console.log(e));
		});

		socket.on("disconnect", () => {
			console.log("User disconnected");
		});
	});
};
