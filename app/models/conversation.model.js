const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema(
	{
		roomId: { type: String, unique: true, required: true },
		
		// Type of conversation: "job" (recruiter hiring) or "service" (candidate/recruiter service fulfillment)
		conversationType: {
			type: String,
			enum: ["job", "service"],
			default: "job",
		},

		// Assigned HR Admin
		hrId: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser", required: true },

		// End user (Candidate or Recruiter)
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
		
		// Backward compatibility alias for recruiter
		recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },

		// For Job Recruitment chats (Optional for service chats)
		jobId: { type: mongoose.Schema.Types.ObjectId, ref: "jobs", default: null },

		// For Service Order chats (Optional for job chats)
		serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "service", default: null },

		lastMessage: { type: String, default: "" },
		lastMessageAt: { type: Date, default: Date.now },
		unreadCountHR: { type: Number, default: 0 },
		unreadCountUser: { type: Number, default: 0 },
		unreadCountRecruiter: { type: Number, default: 0 }, // Kept for backward compatibility
		isClosed: { type: Boolean, default: false },
		closedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
		closedAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("conversation", conversationSchema);