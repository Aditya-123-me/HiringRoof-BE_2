const mongoose = require("mongoose");
const JobApplication = require("./app/models/jobApplication.model");
const config = require("./app/config/config");

async function run() {
	try {
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected to MongoDB");

		const apps = await JobApplication.find({ temp: { $ne: null } });
		console.log(`Found ${apps.length} applications with pending reschedule requests`);
		apps.forEach(app => {
			console.log(`ID: ${app._id}, temp:`, app.temp);
		});

	} catch (err) {
		console.error(err);
	} finally {
		await mongoose.disconnect();
	}
}

run();
