const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/user.model");
require("../app/models/adminUser.model");
require("../app/models/job.model");
require("../app/models/jobApplication.model");
require("../app/models/service.model");
const superAdminController = require("../app/controllers/superAdmin.controller");

async function testEndpoint() {
	try {
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected to MongoDB...");

		const req = {
			body: { userId: "6a749315550f7a7b766f6982" }
		};

		const res = {
			status(code) {
				console.log(`HTTP Status: ${code}`);
				return this;
			},
			json(payload) {
				console.log("\nAPI Payload Status:", payload.status);
				console.log("Candidate Name:", payload.candidateDetails?.name);
				console.log("Summary:", JSON.stringify(payload.summary, null, 2));
				console.log("Bar Graph Data (Timeline):", JSON.stringify(payload.barGraphData, null, 2));
				console.log("Pie Chart Data (Percentages):", JSON.stringify(payload.pieChartData, null, 2));
				console.log("Total Applications History returned:", payload.applicationHistory?.length);
				return this;
			}
		};

		await superAdminController.getCandidateAnalytics(req, res);

		mongoose.disconnect();
	} catch (e) {
		console.error(e);
		mongoose.disconnect();
	}
}

testEndpoint();
