const mongoose = require("mongoose");

const jobApplicationSchema = mongoose.Schema(
	{
		applicantId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
		applierId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
		jobId: { type: mongoose.Schema.Types.ObjectId, ref: "jobs", required: true },
		shortlist: { type: Boolean, default: false },
		interviews: { type: Boolean, default: false },
		interviews2: { type: Boolean, default: false },
		selectedCandidates: { type: Boolean, default: null },
		interviewsDate: { type: String, default: "" },
		interviewsTime: { type: String, default: "" },
		interviews2Date: { type: String, default: "" },
		interviews2Time: { type: String, default: "" },
		interviewExtras: { type: String, default: "" },
		temp: {
			newDate: { type: String },
			newTime: { type: String },
			reason: { type: String },
			requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" }, // Company sending the request
			requestedAt: { type: Date },
			interviewType: { type: String, enum: ["interviews", "interviews2"] },
		},
		rescheduledInterviews: [
			{
				originalDate: { type: String, default: "" },
				originalTime: { type: String, default: "" },
				reason: { type: String, default: "" },
				rescheduledAt: { type: Date, default: Date.now },
				interviewType: { type: String, enum: ["interviews", "interviews2"] },
			},
		],
		feedback: {
			comments: { type: String },
			experience: { type: String },
			givenBy: { type: mongoose.Schema.Types.ObjectId, ref: "adminUsers" },
			createdAt: { type: Date },
			updatedAt: { type: Date },
		},
		offerLetterDate: { type: String, default: "" },
		offerLetterTime: { type: String, default: "" },
		skillsLevel: { type: Object },
		interviewStatus: {
			interviewPending: { type: Boolean, default: false },
			interview2Pending: { type: Boolean, default: false },
			timestamp1: { type: Date, default: null },
			timestamp2: { type: Date, default: null },
			takenBy: { type: mongoose.Schema.Types.ObjectId, ref: "adminusers" },
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("jobApplications", jobApplicationSchema);
