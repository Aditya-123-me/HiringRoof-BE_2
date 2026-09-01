const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/user.model"); // Register user schema first
const jobModel = require("../app/models/job.model");

async function analyzeJobs() {
	try {
		console.log("Connecting to MongoDB...");
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected successfully!\n");

		const allJobs = await jobModel.find({})
			.populate({ path: "userId", select: "name email phone userType" })
			.sort({ createdAt: -1 });

		console.log(`Total jobs in database: ${allJobs.length}\n`);

		const dummyKeywords = [
			"test", "dummy", "sample", "purpose", "asdf", "qwerty", "temp", "demo", "anb",
			"foo", "bar", "testing", "fake", "trial", "123", "abc", "check"
		];

		const dummyJobs = [];
		const realJobs = [];

		allJobs.forEach((job) => {
			const title = (job.jobTittle || "").trim();
			const titleLower = title.toLowerCase();
			const company = (job.companyName || job.companyShortName || "").toLowerCase();
			const note = (job.note || "").toLowerCase();
			const posterName = (job.userId?.name || "").toLowerCase();
			const posterEmail = (job.userId?.email || "").toLowerCase();

			const reasons = [];

			// Check title keywords
			dummyKeywords.forEach((kw) => {
				if (titleLower.includes(kw)) reasons.push(`Title contains "${kw}"`);
			});

			// Check company keywords
			dummyKeywords.forEach((kw) => {
				if (company.includes(kw)) reasons.push(`Company contains "${kw}"`);
			});

			// Check note keywords
			if (note.includes("development purpose") || note.includes("test job") || note.includes("asdf")) {
				reasons.push("Note contains test phrase");
			}

			// Check poster
			if (posterEmail.includes("test") || posterName.includes("test") || posterEmail.includes("example.com")) {
				reasons.push(`Poster email/name looks like test (${job.userId?.email || 'N/A'})`);
			}

			// Check corrupted symbol strings
			if (/[\&\#\$\%\@\!\*\_\-\+\(\)\=\%\^\©\§\\]{3,}/.test(title)) {
				reasons.push("Title contains corrupted/special character sequence");
			}

			// Check short batch pattern titles like "a20", "a21", "a30", "At10", "AT1", "At40", "C30"
			if (/^(a|at|c)\d{1,2}$/i.test(title)) {
				reasons.push(`Title matches batch test pattern "${title}"`);
			}

			if (reasons.length > 0) {
				dummyJobs.push({
					id: job._id.toString(),
					title: job.jobTittle,
					company: job.companyName || job.companyShortName || "N/A",
					poster: job.userId ? `${job.userId.name} (${job.userId.email || 'No email'})` : "Unknown",
					createdAt: job.createdAt ? new Date(job.createdAt).toLocaleString() : "N/A",
					isActive: job.isActive,
					isDeleted: job.isDeleted,
					reasons: [...new Set(reasons)]
				});
			} else {
				realJobs.push({
					id: job._id.toString(),
					title: job.jobTittle,
					company: job.companyName || job.companyShortName || "N/A",
					poster: job.userId ? `${job.userId.name} (${job.userId.email || 'No email'})` : "Unknown",
					createdAt: job.createdAt ? new Date(job.createdAt).toLocaleString() : "N/A",
					isActive: job.isActive,
					isDeleted: job.isDeleted
				});
			}
		});

		console.log("=========================================");
		console.log(`SUMMARY REPORT`);
		console.log(`Total Jobs in DB: ${allJobs.length}`);
		console.log(`Identified Dummy / Test Jobs: ${dummyJobs.length}`);
		console.log(`Identified Real / Genuine Jobs: ${realJobs.length}`);
		console.log("=========================================\n");

		console.log(`--- 🚨 IDENTIFIED DUMMY / TEST JOBS (${dummyJobs.length}) ---`);
		dummyJobs.forEach((j, i) => {
			console.log(`${i + 1}. [ID: ${j.id}] "${j.title}" | Company: "${j.company}"`);
			console.log(`   Poster: ${j.poster} | Created: ${j.createdAt} | IsActive: ${j.isActive}`);
			console.log(`   Reasons: ${j.reasons.join(", ")}\n`);
		});

		console.log(`\n--- ✅ LIKELY REAL / GENUINE JOBS (${realJobs.length}) ---`);
		realJobs.forEach((j, i) => {
			console.log(`${i + 1}. [ID: ${j.id}] "${j.title}" | Company: "${j.company}" | Poster: ${j.poster}`);
		});

		mongoose.disconnect();
	} catch (err) {
		console.error("Error analyzing jobs:", err);
		mongoose.disconnect();
	}
}

analyzeJobs();
