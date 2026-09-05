const fs = require('fs');

const filePath = 'E:/Anb_Carfts_Projects/Target CV/HVProject/HiringRoof/HiringRoofWorkingDir/HiringRoof-BE_2_Old/app/controllers/jobApplication.controller.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix doInterviewSelect
const marker1 = 'jobApplication.doInterviewSelect = async (req, res, io) => {';
const idx1 = content.indexOf(marker1);
if (idx1 !== -1) {
	const return1 = content.indexOf('return res.status(200)', idx1);
	if (return1 !== -1) {
		const end1 = content.indexOf('});', return1);
		const targetBlock = content.slice(content.indexOf('const data = await createNotification({', idx1), end1 + 3);
		const replacement = `await notifyStageEvent({
			io,
			senderId: updatedApplication.applierId,
			senderType: "user",
			candidateId: updatedApplication.applicantId,
			recruiterId: updatedApplication.applierId,
			job: updatedApplication.jobId,
			candidateMsg: \`Interview Round 1 scheduled for \${updatedApplication.jobId.jobTittle} on \${updatedApplication.interviewsDate || ""} at \${updatedApplication.interviewsTime || ""}\`,
			recruiterMsg: \`Interview Round 1 scheduled with \${updatedApplication.applicantId.name || "Candidate"} for \${updatedApplication.jobId.jobTittle}\`,
			hrMsg: \`Interview Round 1 scheduled with \${updatedApplication.applicantId.name || "Candidate"} for job \${updatedApplication.jobId.jobTittle}\`
		});

		return res.status(200).send({ status: true, msg: "Application updated for interview !!", data: updatedApplication });`;

		content = content.replace(targetBlock, replacement);
		console.log("Replaced doInterviewSelect notification");
	}
}

// 2. Fix doInterview2Select
const marker2 = 'jobApplication.doInterview2Select = async (req, res, io) => {';
const idx2 = content.indexOf(marker2);
if (idx2 !== -1) {
	const return2 = content.indexOf('return res.status(200)', idx2);
	if (return2 !== -1) {
		const end2 = content.indexOf('});', return2);
		const targetBlock = content.slice(content.indexOf('const data = await createNotification({', idx2), end2 + 3);
		const replacement = `await notifyStageEvent({
			io,
			senderId: updatedApplication.applierId,
			senderType: "user",
			candidateId: updatedApplication.applicantId,
			recruiterId: updatedApplication.applierId,
			job: updatedApplication.jobId,
			candidateMsg: \`Interview Round 2 scheduled for \${updatedApplication.jobId.jobTittle} on \${req.body.interviews2Date || updatedApplication.interviews2Date || ""} at \${updatedApplication.interviews2Time || ""}\`,
			recruiterMsg: \`Interview Round 2 scheduled with \${updatedApplication.applicantId.name || "Candidate"} for \${updatedApplication.jobId.jobTittle}\`,
			hrMsg: \`Interview Round 2 scheduled with \${updatedApplication.applicantId.name || "Candidate"} for job \${updatedApplication.jobId.jobTittle}\`
		});

		return res.status(200).send({ status: true, msg: "Application updated for interview 2 !!", data: updatedApplication });`;

		content = content.replace(targetBlock, replacement);
		console.log("Replaced doInterview2Select notification");
	}
}

// 3. Fix selected
const marker3 = 'jobApplication.selected = async (req, res, io) => {';
const idx3 = content.indexOf(marker3);
if (idx3 !== -1) {
	const return3 = content.indexOf('return res.status(200)', idx3);
	if (return3 !== -1) {
		const end3 = content.indexOf('});', return3);
		const targetBlock = content.slice(content.indexOf('const data = await createNotification({', idx3), end3 + 3);
		const replacement = `await notifyStageEvent({
			io,
			senderId: updatedApplication.applierId,
			senderType: "user",
			candidateId: updatedApplication.applicantId,
			recruiterId: updatedApplication.applierId,
			job: updatedApplication.jobId,
			candidateMsg: \`Congratulations! You have been selected for \${updatedApplication.jobId.jobTittle} at \${updatedApplication.jobId.companyName || "Hiring Roof"}\`,
			recruiterMsg: \`You selected \${updatedApplication.applicantId.name || "Candidate"} for \${updatedApplication.jobId.jobTittle} job\`,
			hrMsg: \`\${updatedApplication.applicantId.name || "Candidate"} has been selected for \${updatedApplication.jobId.jobTittle}\`
		});

		return res.status(200).send({ status: true, msg: "Application updated for selected !!", data: updatedApplication });`;

		content = content.replace(targetBlock, replacement);
		console.log("Replaced selected notification");
	}
}

fs.writeFileSync(filePath, content, 'utf8');
