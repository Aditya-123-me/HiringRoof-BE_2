const mongoose = require("mongoose");
const config = require("./app/config/config");

// Import all models to ensure schemas are registered
const User = require("./app/models/user.model");
const Job = require("./app/models/job.model");
const JobApplication = require("./app/models/jobApplication.model");
const Chat = require("./app/models/chat.model");
const Contact = require("./app/models/contact.model");
const Notification = require("./app/models/notification.model");
const Payment = require("./app/models/payment.model");
const Rejected = require("./app/models/rejected.model");
const Save = require("./app/models/save.model");
const Service = require("./app/models/service.model");
const Ticket = require("./app/models/ticket.model");
const AdminUser = require("./app/models/adminUser.model");

async function cleanup() {
	try {
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected to MongoDB for Database Cleanup\n");

		// List of collections to clean completely
		const collectionsToClean = [
			{ model: User, name: "Users (Candidates & Recruiters)" },
			{ model: Job, name: "Jobs" },
			{ model: JobApplication, name: "Job Applications" },
			{ model: Chat, name: "Chats" },
			{ model: Contact, name: "Contact Messages" },
			{ model: Notification, name: "Notifications" },
			{ model: Payment, name: "Payments" },
			{ model: Rejected, name: "Rejected Records" },
			{ model: Save, name: "Saved Records" },
			{ model: Service, name: "Services" },
			{ model: Ticket, name: "Tickets" }
		];

		// 1. Clear candidate/employer related tables
		for (const target of collectionsToClean) {
			const count = await target.model.countDocuments();
			console.log(`Clearing ${count} records from "${target.name}"...`);
			await target.model.deleteMany({});
			console.log(`Successfully cleared "${target.name}".`);
		}

		// 2. Audit Admin users (ensure we keep them)
		const adminCount = await AdminUser.countDocuments();
		console.log(`\nVerified: Keeping all ${adminCount} Admin/HR users intact in the system.`);
		
		const admins = await AdminUser.find({}, "name email type");
		admins.forEach(admin => {
			console.log(` - ${admin.name} (${admin.email}) [Role: ${admin.type}]`);
		});

		console.log("\nCleanup successfully completed! Database is ready for professional use.");
	} catch (err) {
		console.error("Cleanup failed:", err);
	} finally {
		await mongoose.disconnect();
	}
}

cleanup();
