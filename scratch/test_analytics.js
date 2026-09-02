const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/user.model");
require("../app/models/adminUser.model");
require("../app/models/job.model");
require("../app/models/jobApplication.model");
require("../app/models/service.model");
const superAdminController = require("../app/controllers/superAdmin.controller");

async function testAnalytics() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected successfully!\n");

		const req = { query: { page: 1, limit: 50 } };
		const res = {
			status(code) {
				console.log(`Response status code: ${code}`);
				return this;
			},
			json(payload) {
				console.log("Response JSON Status:", payload.status);
				console.log("Response JSON Message:", payload.msg);
				if (payload.summary) {
					console.log("Summary:", JSON.stringify(payload.summary, null, 2));
				}
				console.log(`Total jobs returned: ${payload.jobs ? payload.jobs.length : 0}`);
				return this;
			}
		};

		await superAdminController.getCompleteAnalytics(req, res);

		mongoose.disconnect();
	} catch (e) {
		console.error("Test error:", e);
		mongoose.disconnect();
	}
}

testAnalytics();
