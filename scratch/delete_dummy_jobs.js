const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/user.model");
const jobModel = require("../app/models/job.model");

// Specify action: "soft" (set isDeleted: true) or "hard" (delete from DB)
const ACTION = process.argv[2] || "soft"; 

async function cleanupDummyJobs() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected successfully!\n");

		const allJobs = await jobModel.find({}).populate({ path: "userId", select: "name email phone userType" });

		const dummyKeywords = [
			"test", "dummy", "sample", "purpose", "asdf", "qwerty", "temp", "demo", "anb",
			"foo", "bar", "testing", "fake", "trial", "123", "abc", "check"
		];

		const dummyJobIds = [];

		allJobs.forEach((job) => {
			const title = (job.jobTittle || "").trim();
			const titleLower = title.toLowerCase();
			const company = (job.companyName || job.companyShortName || "").toLowerCase();
			const note = (job.note || "").toLowerCase();
			const posterName = (job.userId?.name || "").toLowerCase();
			const posterEmail = (job.userId?.email || "").toLowerCase();

			let isDummy = false;

			// Check title & company keywords
			dummyKeywords.forEach((kw) => {
				if (titleLower.includes(kw) || company.includes(kw)) isDummy = true;
			});

			// Check note keywords
			if (note.includes("development purpose") || note.includes("test job") || note.includes("asdf")) {
				isDummy = true;
			}

			// Check poster
			if (posterEmail.includes("test") || posterName.includes("test") || posterEmail.includes("example.com")) {
				isDummy = true;
			}

			// Check corrupted symbol strings
			if (/[\&\#\$\%\@\!\*\_\-\+\(\)\=\%\^\©\§\\]{3,}/.test(title) || /[\&\#\$\%\@\!\*\_\-\+\(\)\=\%\^\©\§\\]{3,}/.test(company)) {
				isDummy = true;
			}

			// Check short batch pattern titles like "a20", "a21", "a30", "At10", "AT1", "At40", "C30"
			if (/^(a|at|c)\d{1,2}$/i.test(title) || /^(a|at|c)\d{1,2}$/i.test(company)) {
				isDummy = true;
			}

			if (isDummy) {
				dummyJobIds.push(job._id);
			}
		});

		console.log(`Identified ${dummyJobIds.length} dummy/test jobs for cleanup.`);

		if (dummyJobIds.length === 0) {
			console.log("No dummy jobs found to delete.");
			mongoose.disconnect();
			return;
		}

		if (ACTION === "hard") {
			const res = await jobModel.deleteMany({ _id: { $in: dummyJobIds } });
			console.log(`[HARD DELETE] Successfully deleted ${res.deletedCount} dummy jobs from MongoDB.`);
		} else {
			const res = await jobModel.updateMany({ _id: { $in: dummyJobIds } }, { $set: { isDeleted: true, isActive: false } });
			console.log(`[SOFT DELETE] Successfully marked ${res.modifiedCount} dummy jobs as isDeleted: true & isActive: false.`);
		}

		mongoose.disconnect();
	} catch (err) {
		console.error("Error cleaning up dummy jobs:", err);
		mongoose.disconnect();
	}
}

cleanupDummyJobs();
