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

		// Recruiter <-> HR Direct Chat Socket Events
		const messageModel = require("../models/message.model");
		const conversationModel = require("../models/conversation.model");

		socket.on("joinChatRoom", async (roomId) => {
			socket.join(roomId);
			const history = await messageModel.find({ roomId }).sort({ createdAt: 1 }).limit(100);
			socket.emit(`chatHistory_${roomId}`, history);
		});

		socket.on("leaveChatRoom", (roomId) => {
			socket.leave(roomId);
		});

		socket.on("sendChatMessage", async (data) => {
			try {
				const { roomId, text, senderId, senderType, conversationId, attachments } = data;
				if (!roomId || !text?.trim()) return;

				// Check if conversation is closed
				const activeConv = conversationId 
					? await conversationModel.findById(conversationId)
					: await conversationModel.findOne({ roomId });

				if (activeConv && activeConv.isClosed) {
					socket.emit(`chatError_${roomId}`, {
						msg: "This service/conversation has been closed. Chatting is disabled.",
						isClosed: true
					});
					return;
				}

				const message = await messageModel.create({
					conversationId: conversationId || null,
					roomId,
					senderId,
					senderType: senderType || "user",
					text: text.trim(),
					attachments: Array.isArray(attachments) ? attachments : [],
				});

				// Update conversation record
				const isHR = senderType === "hr" || senderType === "adminUser";
				const updateData = {
					lastMessage: text.trim(),
					lastMessageAt: new Date(),
				};
				if (isHR) {
					updateData.$inc = { unreadCountRecruiter: 1 };
				} else {
					updateData.$inc = { unreadCountHR: 1 };
				}

				if (conversationId) {
					await conversationModel.findByIdAndUpdate(conversationId, updateData);
				} else {
					await conversationModel.findOneAndUpdate({ roomId }, updateData);
				}

				// Broadcast to room
				io.to(roomId).emit(`newChatMessage_${roomId}`, message);
				socket.broadcast.to(roomId).emit(`chat_notification_${roomId}`, message);
			} catch (err) {
				console.error("Socket sendChatMessage error:", err);
			}
		});

		socket.on("typing", ({ roomId, senderName }) => {
			socket.to(roomId).emit(`typing_${roomId}`, { senderName });
		});

		socket.on("stopTyping", ({ roomId }) => {
			socket.to(roomId).emit(`stopTyping_${roomId}`);
		});

		socket.on("disconnect", () => {
			console.log("User disconnected");
		});
	});
};
