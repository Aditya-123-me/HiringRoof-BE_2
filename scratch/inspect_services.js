const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/user.model");
require("../app/models/adminUser.model");
const serviceModel = require("../app/models/service.model");
const conversationModel = require("../app/models/conversation.model");

async function inspectServices() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected successfully!\n");

		const services = await serviceModel.find({}).populate("userId").populate("assignedHR");
		console.log(`Found ${services.length} services in DB:\n`);

		for (const s of services) {
			console.log(`ID: ${s._id}`);
			console.log(`Title: ${s.serviceType || s.serviceData?.title || s.addonId?.title}`);
			console.log(`User: ${s.userId?.name} (${s.userId?.email})`);
			console.log(`Assigned HR: ${s.assignedHR ? `${s.assignedHR.name} (${s.assignedHR._id})` : "NULL / UNASSIGNED"}`);
			console.log(`Fulfillment Status: ${s.fulfillmentStatus}`);
			console.log(`Payment Status: ${s.paymentStatus}`);
			console.log("------------------------------------------------");
		}

		console.log("\nConversations:");
		const convs = await conversationModel.find({}).populate("hrId").populate("userId");
		for (const c of convs) {
			console.log(`RoomID: ${c.roomId}`);
			console.log(`HR: ${c.hrId?.name} (${c.hrId?._id})`);
			console.log(`User: ${c.userId?.name} (${c.userId?._id})`);
			console.log(`ServiceId: ${c.serviceId}`);
			console.log(`JobId: ${c.jobId}`);
			console.log("------------------------------------------------");
		}

		mongoose.disconnect();
	} catch (e) {
		console.error("Inspect error:", e);
		mongoose.disconnect();
	}
}

inspectServices();
