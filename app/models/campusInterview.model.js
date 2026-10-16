const mongoose = require("mongoose");

const campusInterviewSchema = mongoose.Schema(
	{
		candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: "campusStudents", required: true, index: true },
		company_id: { type: mongoose.Schema.Types.ObjectId, ref: "campusRecruiters", required: true, index: true },
		college_id: { type: mongoose.Schema.Types.ObjectId, ref: "colleges", required: true, index: true },
		interview_date: { type: Date, required: [true, "Interview date is required"] },
		time_slot: { type: String, required: [true, "Time slot is required"], trim: true },
		round_name: { type: String, required: [true, "Round name is required"], trim: true },
		panelist_name: { type: String, required: [true, "Panelist name is required"], trim: true },
		panelist_email: { type: String, required: [true, "Panelist email is required"], trim: true, lowercase: true },
		status: { type: String, enum: ["Scheduled", "Offer Extended", "Rejected"], default: "Scheduled" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("campusInterviews", campusInterviewSchema);
