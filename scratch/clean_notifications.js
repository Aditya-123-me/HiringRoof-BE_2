const fs = require('fs');

const filePath = 'E:/Anb_Carfts_Projects/Target CV/HVProject/HiringRoof/HiringRoofWorkingDir/HiringRoof-BE_2_Old/app/controllers/jobApplication.controller.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. In apply method:
const applyOld = `\t\tconst data = await createNotification({
\t\t\tsenderId: applicantId,
\t\t\treceiverId: applierId,
\t\t\ttitle: \`\${populatedData.jobId.jobTittle}\`,
\t\t\tdesc: \`\${populatedData.applicantId.name === "" ? "Someone" : populatedData.applicantId.name} apply for your \${
\t\t\t\tpopulatedData.jobId.jobTittle
\t\t\t} job\`,
\t\t\tlogo: populatedData.jobId.companyLogo,
\t\t});
\t\tio.emit(\`notifications_\${data.receiverId._id}\`, data);`;

const applyNew = `\t\tawait notifyStageEvent({
\t\t\tio,
\t\t\tsenderId: applicantId,
\t\t\tsenderType: "user",
\t\t\tcandidateId: applicantId,
\t\t\trecruiterId: applierId,
\t\t\tjob: populatedData.jobId,
\t\t\tcandidateMsg: \`You applied for \${populatedData.jobId.jobTittle} at \${populatedData.jobId.companyName || "Hiring Roof"}\`,
\t\t\trecruiterMsg: \`\${populatedData.applicantId.name || "Someone"} applied for your \${populatedData.jobId.jobTittle} job\`,
\t\t\thrMsg: \`\${populatedData.applicantId.name || "Someone"} applied for job \${populatedData.jobId.jobTittle}\`
\t\t});`;

content = content.replace(applyOld, applyNew);

// Function to clean old createNotification calls before notifyStageEvent
function cleanOldNotifs(methodName, oldBlockPattern) {
	const methodIdx = content.indexOf(methodName);
	if (methodIdx !== -1) {
		const nextMethodIdx = content.indexOf("return res.status(200)", methodIdx);
		if (nextMethodIdx !== -1) {
			let slice = content.slice(methodIdx, nextMethodIdx);
			// remove createNotification calls inside slice if notifyStageEvent is present
			if (slice.includes("notifyStageEvent")) {
				slice = slice.replace(/const data = await createNotification[\s\S]*?io\.emit\(.*?\);/g, "");
				slice = slice.replace(/const data2 = await createNotification[\s\S]*?io\.emit\(.*?\);/g, "");
				content = content.slice(0, methodIdx) + slice + content.slice(nextMethodIdx);
			}
		}
	}
}

cleanOldNotifs("jobApplication.shortlist =", "shortlist");
cleanOldNotifs("jobApplication.notSelected =", "notSelected");
cleanOldNotifs("jobApplication.doInterviewSelect =", "doInterviewSelect");
cleanOldNotifs("jobApplication.doInterview2Select =", "doInterview2Select");
cleanOldNotifs("jobApplication.selected =", "selected");
cleanOldNotifs("jobApplication.adminShortlist =", "adminShortlist");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully cleaned duplicate notifications");
