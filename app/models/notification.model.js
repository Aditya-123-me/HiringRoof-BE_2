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
				logo: "https://drive.google.com/uc?export=download&id=1ybpi3L_-XDjHyZmiyIjg-ZZ5S-1jk3MU",
			},
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("notifications", notificationSchema);
