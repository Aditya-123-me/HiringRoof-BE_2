const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/user.model");
require("../app/models/adminUser.model");
const serviceModel = require("../app/models/service.model");
const jobModel = require("../app/models/job.model");

async function syncAssignments() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected successfully!\n");

		const assignedServices = await serviceModel.find({
			assignedHR: { $exists: true, $ne: null }
		}).populate("userId");

		console.log(`Found ${assignedServices.length} assigned service orders.`);

		for (const service of assignedServices) {
			if (!service.userId) continue;

			const sType = service.serviceType || service.serviceData?.title || service.addonId?.name || "";
			const cleanType = sType.replace(/hiring/i, "").trim();
			const regex = new RegExp(cleanType || "Immediate", "i");

			const updatedJobs = await jobModel.updateMany(
				{
					userId: service.userId._id,
					$or: [
						{ serviceType: regex },
						{ "addOn.name": regex },
						{ "addOn.title": regex }
					],
					isDeleted: { $ne: true }
				},
				{ $set: { assignedHR: service.assignedHR } }
			);

			console.log(`Synced service [${service._id}] (Type: ${cleanType}) -> HR [${service.assignedHR}]: Modified ${updatedJobs.modifiedCount} jobs.`);
		}

		console.log("\nAssignment Sync Completed Successfully!");
		mongoose.disconnect();
	} catch (e) {
		console.error("Sync error:", e);
		mongoose.disconnect();
	}
}

syncAssignments();
