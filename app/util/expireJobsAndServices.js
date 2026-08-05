const jobModel = require("../models/job.model");
const serviceModel = require("../models/service.model");

const expireJobsAndServices = async () => {
	try {
		const today = new Date().toISOString().split("T")[0];
		
		// Find all active jobs that have an expireDate and have expired
		const expiredJobs = await jobModel.find({
			isActive: true,
			expireDate: { $ne: "", $exists: true },
			$expr: { $lt: ["$expireDate", today] }
		});

		if (expiredJobs.length > 0) {
			const expiredJobIds = expiredJobs.map(job => job._id);

			// Deactivate the jobs
			await jobModel.updateMany(
				{ _id: { $in: expiredJobIds } },
				{ $set: { isActive: false } }
			);

			// Deactivate corresponding service records
			for (const jobId of expiredJobIds) {
				await serviceModel.updateMany(
					{ merchantTransactionId: `MANUAL_JOB_ADDON_${jobId}` },
					{ $set: { isActive: false } }
				);
			}

			console.log(`[expireJobsAndServices] Successfully expired ${expiredJobs.length} jobs and their services.`);
		}
	} catch (error) {
		console.error("Error in expireJobsAndServices utility:", error);
	}
};

module.exports = expireJobsAndServices;
