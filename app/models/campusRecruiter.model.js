const mongoose = require("mongoose");

const campusRecruiterSchema = mongoose.Schema(
	{
		recruiter_id: { type: String, required: [true, "Recruiter id is required"], trim: true, unique: true, index: true },
		company_name: { type: String, required: [true, "Company name is required"], trim: true },
		verification_status: { type: String, enum: { values: ["Pending", "Verified", "Rejected"], message: "verification_status must be one of Pending, Verified, Rejected" }, default: "Pending" },
		domain: { type: String, default: "", trim: true },
		location: { type: String, default: "", trim: true },
		contact_name: { type: String, default: "", trim: true },
		contact_email: { type: String, default: "", trim: true, lowercase: true },
		contact_phone: { type: String, default: "", trim: true },
		company_website: { type: String, default: "", trim: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("campusRecruiters", campusRecruiterSchema);
