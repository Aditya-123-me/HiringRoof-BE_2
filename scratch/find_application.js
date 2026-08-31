const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/job.model");
const JobApplication = require("../app/models/jobApplication.model");
const User = require("../app/models/user.model");

async function run() {
	try {
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected to MongoDB");

		const app = await JobApplication.findOne({}).populate("applicantId").populate("jobId").lean();
		console.log("Sample JobApplication document keys:", Object.keys(app));
		console.log("skillsLevel on JobApplication:", app.skillsLevel);
		console.log("skills on applicantId:", app.applicantId?.skills);
		console.log("skillSubCategories on applicantId:", app.applicantId?.skillSubCategories);
		console.log("skillDetails on applicantId:", app.applicantId?.skillDetails);

	} catch (err) {
		console.error(err);
	} finally {
		await mongoose.disconnect();
	}
}

run();
