const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema(
	{
		roomId: { type: String, unique: true, required: true },
		hrId: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser", required: true },
		recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
		jobId: { type: mongoose.Schema.Types.ObjectId, ref: "jobs", required: true },
		lastMessage: { type: String, default: "" },
		lastMessageAt: { type: Date, default: Date.now },
		unreadCountHR: { type: Number, default: 0 },
		unreadCountRecruiter: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("conversation", conversationSchema);
