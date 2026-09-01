const mongoose = require("mongoose");
const config = require("../app/config/config");
const superAdmin = require("../app/controllers/superAdmin.controller");

async function testAnalytics() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected successfully!");

		const req = {
			query: {
				page: 1,
				limit: 10,
				status: "all"
			}
		};

		const res = {
			status: function (code) {
				this.statusCode = code;
				return this;
			},
			json: function (data) {
				console.log("\n--- RESPONSE STATUS ---", this.statusCode);
				console.log("--- SUMMARY DATA ---", JSON.stringify(data.summary, null, 2));
				console.log("--- TOTAL JOBS RETURNED ---", data.jobs.length);
				if (data.jobs.length > 0) {
					console.log("--- SAMPLE JOB 1 ---");
					console.log("Job Title:", data.jobs[0].jobTitle);
					console.log("Recruiter:", data.jobs[0].recruiterDetails);
					console.log("Assigned HR:", data.jobs[0].assignedHRDetails);
					console.log("Application Summary:", data.jobs[0].applicationsSummary);
					console.log("Candidates Count:", data.jobs[0].candidatesList.length);
				}
				return this;
			}
		};

		await superAdmin.getCompleteAnalytics(req, res);
		mongoose.disconnect();
	} catch (e) {
		console.error("Test error:", e);
		mongoose.disconnect();
	}
}

testAnalytics();
