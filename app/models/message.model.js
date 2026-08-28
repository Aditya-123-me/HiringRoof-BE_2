const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
	{
		conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "conversation", required: true },
		roomId: { type: String, required: true },
		senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
		senderType: { type: String, enum: ["hr", "recruiter", "adminUser", "user"], required: true },
		text: { type: String, default: "" },
		attachments: [{ type: String }],
		isRead: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("message", messageSchema);
