const mongoose = require("mongoose");

const notificationSchema = mongoose.Schema(
	{
		senderType: { type: String, enum: ["user", "adminUser"], required: true },
		receiverType: { type: String, enum: ["user", "adminUser"], required: true },
		senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
		receiverId: { type: mongoose.Schema.Types.ObjectId, required: true },
		title: { type: String, default: "", required: true },
		desc: { type: String, default: "", required: true },
		isSeen: { type: Boolean, default: false },
		extra: {
			type: Object,
			default: {
				logo: "https://firebasestorage.googleapis.com/v0/b/hiringroof.appspot.com/o/static%20data%2FLogo.png?alt=media&token=fa7905e6-11ec-4352-af07-a1fbc200e5d8",
			},
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("notifications", notificationSchema);
