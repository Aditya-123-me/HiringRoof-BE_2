const mongoose = require("mongoose");
require("dotenv").config();

// Mongoose connection URL
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://hiringroofcom:asdfghjkl1@cluster0.pnk5wah.mongodb.net/hiring_roof";

const seedAddons = async () => {
	try {
		console.log("Connecting to Database...");
		await mongoose.connect(MONGO_URL);
		console.log("Database Connected successfully!");

		const db = mongoose.connection.db;
		const adminCollection = db.collection("adminusers");
		const addonCollection = db.collection("addons");

		// Find Super Admin to assign as creator
		let superadmin = await adminCollection.findOne({ email: "superadmin@hiringroof.com" });
		if (!superadmin) {
			superadmin = await adminCollection.findOne({ type: "superAdmin" });
		}
		
		if (!superadmin) {
			console.warn("WARNING: Super Admin user not found. Creating a fallback Admin account first...");
			const fallbackId = new mongoose.Types.ObjectId();
			await adminCollection.insertOne({
				_id: fallbackId,
				name: "Super Admin",
				email: "superadmin@hiringroof.com",
				password: "SuperPassword123",
				type: "admin",
				number: "1234567890",
				isActive: true,
				isDeleted: false,
				createdAt: new Date(),
				updatedAt: new Date()
			});
			superadmin = { _id: fallbackId };
		}

		const defaultAddons = [
			{
				title: "Urgent",
				amount: 100,
				desc: "find the best candidates faster than ever! Streamline your hiring process and discover top talent effortlessly.",
				points: [
					"Priority listing on the job board",
					"Urgent Hiring badge highlighting on job card",
					"Accelerated candidate matching support"
				],
				type: "jobPostAddon",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Immediate",
				amount: 200,
				desc: "Quickly browse and connect with top-tier candidates directly from our hiring platform, ensuring immediate access to the best talent profiles.",
				points: [
					"Instant access to top-tier candidate contact details",
					"Direct recruiter-to-candidate messaging system",
					"Smart keyword and qualification filters"
				],
				type: "jobPostAddon",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Premium",
				amount: 500,
				desc: "Upgrade to our premium addon for instant access to top candidate profiles and dedicated HR support to streamline your hiring process and secure the best talent quickly.",
				points: [
					"Instant access to all verified candidate profiles",
					"Dedicated HR support assistant",
					"Premium badge highlighting on job board posts",
					"Guaranteed candidate application review checks"
				],
				type: "jobPostAddon",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Contact Deal",
				amount: 300,
				desc: "Designed to source the best candidates for contractual positions. Streamline your search for top-tier talent and secure the ideal candidates for your contractual hiring needs",
				points: [
					"Optimized sourcing filters for contract-based roles",
					"Targeted contractual search categories",
					"Contractual employment agreement template support"
				],
				type: "jobPostAddon",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		console.log("Seeding default Addons...");
		for (const addon of defaultAddons) {
			const result = await addonCollection.updateOne(
				{ title: addon.title },
				{ $set: addon },
				{ upsert: true }
			);
			console.log(`Addon '${addon.title}' seeded. Result:`, result);
		}

		console.log("Addons seeding completed successfully!");
		await mongoose.disconnect();
		process.exit(0);
	} catch (error) {
		console.error("Addon seeding failed:", error);
		process.exit(1);
	}
};

seedAddons();
