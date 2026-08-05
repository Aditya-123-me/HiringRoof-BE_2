const mongoose = require("mongoose");
require("dotenv").config();

// Mongoose connection URL
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://hiringroofcom:asdfghjkl1@cluster0.pnk5wah.mongodb.net/hiring_roof";

const seed = async () => {
	try {
		console.log("Connecting to Database...");
		await mongoose.connect(MONGO_URL);
		console.log("Database Connected successfully!");

		const db = mongoose.connection.db;
		// Use raw collection update to bypass Mongoose schema enum restrictions
		const collection = db.collection("adminusers");

		const superadminData = {
			name: "Super Admin",
			email: "superadmin@hiringroof.com",
			password: "SuperPassword123",
			type: "superAdmin",
			number: "1234567890",
			address: "Delhi, India",
			isActive: true,
			isDeleted: false,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		console.log("Seeding Super Admin user...");
		const result = await collection.updateOne(
			{ email: "superadmin@hiringroof.com" },
			{ $set: superadminData },
			{ upsert: true }
		);

		console.log("Super Admin seeded successfully!");
		console.log("Result:", result);
		
		await mongoose.disconnect();
		process.exit(0);
	} catch (error) {
		console.error("Seeding failed:", error);
		process.exit(1);
	}
};

seed();
