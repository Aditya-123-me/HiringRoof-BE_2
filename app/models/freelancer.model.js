const mongoose = require("mongoose");
const freelancerSchema = mongoose.Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		phone: { type: String, required: true },
		experience: { type: String, default: "" },
		resume: { type: String, default: "" }, // URL to uploaded resume/CV
		portfolioLink: { type: String, default: "" },
		about: { type: String, default: "" },

		// Request Status 
		status: {
			type: String,
			enum: ["pending", "approved", "rejected"],
			default: "pending",
		},

		// Super Admin Approval tracking
		approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser", default: null },
		rejectedReason: { type: String, default: "" },
		approvalDate: { type: Date, default: null },

		// Link to the actual HR Admin account created once approved
		adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser", default: null },

		// Special Badge to identify the freelancer HR Admin
		badge: {
			type: String,
			default: "Freelance Partner",
			enum: ["Freelance Partner", "Verified Freelancer", "Elite Freelancer", "none"],
		},
		
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("freelancer", freelancerSchema);
