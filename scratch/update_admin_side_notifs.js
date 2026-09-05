const fs = require('fs');

const filePath = 'E:/Anb_Carfts_Projects/Target CV/HVProject/HiringRoof/HiringRoofWorkingDir/HiringRoof-BE_2_Old/app/controllers/jobApplication.controller.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. adminShortlist
const adminShortlistMarker = 'jobApplication.adminShortlist = async (req, res, io) => {';
const adminShortlistIdx = content.indexOf(adminShortlistMarker);
if (adminShortlistIdx !== -1) {
	const returnIdx = content.indexOf('return res.status(200).send({ status: true, msg: "Application updated for shortlist from Admin Side !!"', adminShortlistIdx);
	if (returnIdx !== -1) {
		const targetBlock = content.slice(content.indexOf('const data = await createNotification({', adminShortlistIdx), returnIdx);
		const replacement = `await notifyStageEvent({
			io,
			senderId: req.user?._id,
			senderType: "adminUser",
			candidateId: updatedApplication.applicantId,
			recruiterId: updatedApplication.applierId,
			job: updatedApplication.jobId,
			candidateMsg: \`You are shortlisted for \${updatedApplication.jobId.jobTittle} at \${updatedApplication.jobId.companyName || "Hiring Roof"} by HR/Admin\`,
			recruiterMsg: \`Admin/HR shortlisted \${updatedApplication.applicantId.name || "Candidate"} for \${updatedApplication.jobId.jobTittle} job\`,
			hrMsg: \`Admin/HR shortlisted \${updatedApplication.applicantId.name || "Candidate"} for job \${updatedApplication.jobId.jobTittle}\`
		});\n\n\t\t`;
		content = content.slice(0, content.indexOf('const data = await createNotification({', adminShortlistIdx)) + replacement + content.slice(returnIdx);
		console.log("Updated adminShortlist");
	}
}

// 2. doInterviewSelectAdminSide
const doIntAdminMarker = 'jobApplication.doInterviewSelectAdminSide = async (req, res, io) => {';
const doIntAdminIdx = content.indexOf(doIntAdminMarker);
if (doIntAdminIdx !== -1) {
	const returnIdx = content.indexOf('return res.status(200).send({ status: true, msg: "Application updated for interview from Admin Side!!"', doIntAdminIdx);
	if (returnIdx !== -1) {
		const targetBlock = content.slice(content.indexOf('const data = await createNotification({', doIntAdminIdx), returnIdx);
		const replacement = `await notifyStageEvent({
			io,
			senderId: req.user?._id,
			senderType: "adminUser",
			candidateId: updatedApplication.applicantId,
			recruiterId: updatedApplication.applierId,
			job: updatedApplication.jobId,
			candidateMsg: \`Interview Round 1 scheduled for \${updatedApplication.jobId.jobTittle} by HR/Admin on \${updatedApplication.interviewsDate || ""} at \${updatedApplication.interviewsTime || ""}\`,
			recruiterMsg: \`HR/Admin scheduled Round 1 interview with \${updatedApplication.applicantId.name || "Candidate"} for \${updatedApplication.jobId.jobTittle}\`,
			hrMsg: \`Round 1 interview scheduled with \${updatedApplication.applicantId.name || "Candidate"} for job \${updatedApplication.jobId.jobTittle}\`
		});\n\n\t\t`;
		content = content.slice(0, content.indexOf('const data = await createNotification({', doIntAdminIdx)) + replacement + content.slice(returnIdx);
		console.log("Updated doInterviewSelectAdminSide");
	}
}

// 3. doInterview2SelectAdminSide
const doInt2AdminMarker = 'jobApplication.doInterview2SelectAdminSide = async (req, res, io) => {';
const doInt2AdminIdx = content.indexOf(doInt2AdminMarker);
if (doInt2AdminIdx !== -1) {
	const returnIdx = content.indexOf('return res.status(200).send({ status: true, msg: "Application updated for interview 2 from Admin Side!!"', doInt2AdminIdx);
	if (returnIdx !== -1) {
		const replacement = `await notifyStageEvent({
			io,
			senderId: req.user?._id,
			senderType: "adminUser",
			candidateId: updatedApplication.applicantId,
			recruiterId: updatedApplication.applierId,
			job: updatedApplication.jobId,
			candidateMsg: \`Interview Round 2 scheduled for \${updatedApplication.jobId.jobTittle} by HR/Admin on \${updatedApplication.interviews2Date || ""} at \${updatedApplication.interviews2Time || ""}\`,
			recruiterMsg: \`HR/Admin scheduled Round 2 interview with \${updatedApplication.applicantId.name || "Candidate"} for \${updatedApplication.jobId.jobTittle}\`,
			hrMsg: \`Round 2 interview scheduled with \${updatedApplication.applicantId.name || "Candidate"} for job \${updatedApplication.jobId.jobTittle}\`
		});\n\n\t\t`;
		content = content.slice(0, content.indexOf('const data = await createNotification({', doInt2AdminIdx)) + replacement + content.slice(returnIdx);
		console.log("Updated doInterview2SelectAdminSide");
	}
}

// 4. selectedAdminSide
const selectedAdminMarker = 'jobApplication.selectedAdminSide = async (req, res, io) => {';
const selectedAdminIdx = content.indexOf(selectedAdminMarker);
if (selectedAdminIdx !== -1) {
	const returnIdx = content.indexOf('return res.status(200).send({ status: true, msg: "Application updated for selected from Admin Side!!"', selectedAdminIdx);
	if (returnIdx !== -1) {
		const replacement = `await notifyStageEvent({
			io,
			senderId: req.user?._id,
			senderType: "adminUser",
			candidateId: updatedApplication.applicantId,
			recruiterId: updatedApplication.applierId,
			job: updatedApplication.jobId,
			candidateMsg: \`Congratulations! You have been selected for \${updatedApplication.jobId.jobTittle} at \${updatedApplication.jobId.companyName || "Hiring Roof"} by HR/Admin\`,
			recruiterMsg: \`HR/Admin selected \${updatedApplication.applicantId.name || "Candidate"} for \${updatedApplication.jobId.jobTittle} job\`,
			hrMsg: \`\${updatedApplication.applicantId.name || "Candidate"} has been selected for \${updatedApplication.jobId.jobTittle}\`
		});\n\n\t\t`;
		content = content.slice(0, content.indexOf('const data = await createNotification({', selectedAdminIdx)) + replacement + content.slice(returnIdx);
		console.log("Updated selectedAdminSide");
	}
}

fs.writeFileSync(filePath, content, 'utf8');
