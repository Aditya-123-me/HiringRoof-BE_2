const mongoose = require("mongoose");
const config = require("../app/config/config");
require("../app/models/user.model");
require("../app/models/adminUser.model");
require("../app/models/job.model");
require("../app/models/jobApplication.model");
require("../app/models/service.model");

async function testCandidateAnalytics() {
	try {
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected to MongoDB...\n");

		const User = mongoose.model("users");
		const JobApplication = mongoose.model("jobApplications");

		// Find a candidate user with applications
		const candidateApps = await JobApplication.find({}).limit(10).populate("applicantId");
		if (candidateApps.length === 0) {
			console.log("No job applications found in DB.");
			mongoose.disconnect();
			return;
		}

		const sampleApp = candidateApps.find(a => a.applicantId);
		const sampleCandidateId = sampleApp ? sampleApp.applicantId._id.toString() : null;

		console.log("Found sample candidate ID:", sampleCandidateId, sampleApp?.applicantId?.name, sampleApp?.applicantId?.email);

		// Execute candidate analytics lookup
		const applications = await JobApplication.find({ applicantId: sampleCandidateId })
			.populate({
				path: "jobId",
				select: "jobTittle companyName companyShortName companyLogo location jobType workType pay serviceType isActive assignedHR userId",
				populate: [
					{ path: "userId", select: "name email phone companyName companyLogo" },
					{ path: "assignedHR", select: "name email number phone profileImage" }
				]
			})
			.populate({ path: "applicantId", select: "name email phone profileImage experience skills resume" })
			.sort({ createdAt: 1 })
			.lean();

		console.log(`\nApplications count for candidate: ${applications.length}`);

		// Timeline Bar Graph
		const timelineMap = {};
		applications.forEach((app) => {
			const createdDate = new Date(app.createdAt || Date.now());
			const dateKey = createdDate.toISOString().split("T")[0];
			const formattedDate = createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

			if (!timelineMap[dateKey]) {
				timelineMap[dateKey] = { date: dateKey, formattedDate, count: 0 };
			}
			timelineMap[dateKey].count += 1;
		});
		const barGraphData = Object.values(timelineMap);
		console.log("\nBar Graph Data (Timeline):", JSON.stringify(barGraphData, null, 2));

		// Pie Chart Data (Stages Percentage)
		const stagesCount = { applied: 0, shortlisted: 0, interviewing: 0, selected: 0, rejected: 0, offered: 0 };
		applications.forEach((app) => {
			const st = String(app.pipelineStatus || app.status || "applied").toLowerCase();
			if (st.includes("short")) stagesCount.shortlisted += 1;
			else if (st.includes("interview")) stagesCount.interviewing += 1;
			else if (st.includes("select")) stagesCount.selected += 1;
			else if (st.includes("reject")) stagesCount.rejected += 1;
			else if (st.includes("offer")) stagesCount.offered += 1;
			else stagesCount.applied += 1;
		});

		const totalApps = applications.length;
		const pieChartData = [
			{ stage: "Applied", count: stagesCount.applied, percentage: totalApps > 0 ? Number(((stagesCount.applied / totalApps) * 100).toFixed(2)) : 0, color: "#3b82f6" },
			{ stage: "Shortlisted", count: stagesCount.shortlisted, percentage: totalApps > 0 ? Number(((stagesCount.shortlisted / totalApps) * 100).toFixed(2)) : 0, color: "#8b5cf6" },
			{ stage: "Interviewing", count: stagesCount.interviewing, percentage: totalApps > 0 ? Number(((stagesCount.interviewing / totalApps) * 100).toFixed(2)) : 0, color: "#f97316" },
			{ stage: "Selected", count: stagesCount.selected, percentage: totalApps > 0 ? Number(((stagesCount.selected / totalApps) * 100).toFixed(2)) : 0, color: "#22c55e" },
			{ stage: "Rejected", count: stagesCount.rejected, percentage: totalApps > 0 ? Number(((stagesCount.rejected / totalApps) * 100).toFixed(2)) : 0, color: "#ef4444" },
			{ stage: "Offered", count: stagesCount.offered, percentage: totalApps > 0 ? Number(((stagesCount.offered / totalApps) * 100).toFixed(2)) : 0, color: "#10b981" }
		];
		console.log("\nPie Chart Data (Stages Percentage):", JSON.stringify(pieChartData, null, 2));

		mongoose.disconnect();
	} catch (err) {
		console.error(err);
		mongoose.disconnect();
	}
}

testCandidateAnalytics();
