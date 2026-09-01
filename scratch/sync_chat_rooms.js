const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/user.model");
require("../app/models/adminUser.model");
const conversationModel = require("../app/models/conversation.model");
const messageModel = require("../app/models/message.model");
const jobModel = require("../app/models/job.model");

async function mergeDuplicateRooms() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected successfully!\n");

		const allConvs = await conversationModel.find({}).sort({ createdAt: 1 });
		console.log(`Total conversations in DB: ${allConvs.length}`);

		// Group conversations by hrId + userId/recruiterId
		const grouped = {};

		for (const conv of allConvs) {
			const hr = conv.hrId ? conv.hrId.toString() : "no_hr";
			const uId = conv.userId || conv.recruiterId;
			const user = uId ? uId.toString() : "no_user";
			const key = `${hr}_${user}`;

			if (!grouped[key]) grouped[key] = [];
			grouped[key].push(conv);
		}

		for (const key in grouped) {
			const group = grouped[key];
			if (group.length > 1) {
				console.log(`\nFound ${group.length} conversation threads for pair [${key}]. Merging...`);
				
				// Keep the first / primary conversation
				const primaryConv = group[0];
				if (!primaryConv.userId) primaryConv.userId = primaryConv.recruiterId;
				if (!primaryConv.recruiterId) primaryConv.recruiterId = primaryConv.userId;

				const secondaryConvs = group.slice(1);

				// Find latest job or service details
				for (const sec of secondaryConvs) {
					if (sec.jobId && !primaryConv.jobId) primaryConv.jobId = sec.jobId;
					if (sec.serviceId && !primaryConv.serviceId) primaryConv.serviceId = sec.serviceId;

					// Move messages from secondary rooms to primary room
					const movedMsgs = await messageModel.updateMany(
						{ roomId: sec.roomId },
						{ $set: { roomId: primaryConv.roomId, conversationId: primaryConv._id } }
					);
					console.log(`  - Moved ${movedMsgs.modifiedCount} messages from room [${sec.roomId}] to primary room [${primaryConv.roomId}].`);

					// Delete secondary conversation document
					await conversationModel.findByIdAndDelete(sec._id);
				}

				// Find active job if jobId still missing on primary
				if (!primaryConv.jobId) {
					const activeJob = await jobModel.findOne({ userId: primaryConv.userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
					if (activeJob) primaryConv.jobId = activeJob._id;
				}

				await primaryConv.save();
				console.log(`  -> Unified Conversation ID [${primaryConv._id}] with RoomId [${primaryConv.roomId}].`);
			} else if (group.length === 1) {
				const conv = group[0];
				if (!conv.userId) conv.userId = conv.recruiterId;
				if (!conv.recruiterId) conv.recruiterId = conv.userId;

				if (!conv.jobId) {
					const activeJob = await jobModel.findOne({ userId: conv.userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
					if (activeJob) {
						conv.jobId = activeJob._id;
					}
				}
				await conv.save();
				console.log(`Updated single conversation [${conv._id}].`);
			}
		}

		console.log("\nConversations Room Cleanup & Merge Completed!");
		mongoose.disconnect();
	} catch (e) {
		console.error("Error merging chat rooms:", e);
		mongoose.disconnect();
	}
}

mergeDuplicateRooms();
