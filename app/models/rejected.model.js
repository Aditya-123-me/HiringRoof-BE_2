const mongoose = require('mongoose');

const rejectedInterviewSchema = mongoose.Schema({
	jobId: { type: mongoose.Schema.Types.ObjectId, ref: "jobs", required: true },
	appId: { type: mongoose.Schema.Types.ObjectId, ref: "jobApplications", required: true },
	applicantId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
	applierId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
	rejected_reason: { type: String, required: true },
	desc: { type: String, required: true },
	rejected_time: { type: Date, default: Date.now },
	rejected_by: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser", required: true },
	interview_type: { type: String, required: true },
});

module.exports = mongoose.model('rejecteds', rejectedInterviewSchema);


