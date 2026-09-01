const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/user.model");
require("../app/models/adminUser.model");
const serviceModel = require("../app/models/service.model");
const userModel = require("../app/models/user.model");
const adminUserModel = require("../app/models/adminUser.model");

async function syncAllActiveServices() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected successfully!\n");

		const testUser = await userModel.findOne({ email: "test@gmail.com" });
		const hrAdmin = await adminUserModel.findOne({ email: "hr@hiringroof.com" });

		if (!testUser || !hrAdmin) {
			console.log("User or HR Admin not found!");
			mongoose.disconnect();
			return;
		}

		console.log(`Test User ID: ${testUser._id}`);
		console.log(`HR Admin ID: ${hrAdmin._id}`);

		// Update all active services for test@gmail.com to have assignedHR
		const updatedServices = await serviceModel.updateMany(
			{ userId: testUser._id, isDeleted: { $ne: true } },
			{
				$set: {
					assignedHR: hrAdmin._id,
					fulfillmentStatus: "ASSIGNED",
					paymentStatus: "APPROVED"
				}
			}
		);

		console.log(`Successfully updated ${updatedServices.modifiedCount} service records for Test Recruiter.`);

		mongoose.disconnect();
	} catch (e) {
		console.error("Error updating services:", e);
		mongoose.disconnect();
	}
}

syncAllActiveServices();
