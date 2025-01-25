const mongoose = require("mongoose");

const resourceSchema = mongoose.Schema(
	{
		posterId: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser", required: true },
		jobId: { type: mongoose.Schema.Types.ObjectId, ref: "jobs" },
		applicationData: [{
			jobApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: "jobApplications", default: null },
			candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
		}],
	},
	{ timestamps: true }
);

module.exports = mongoose.model("resources", resourceSchema);
