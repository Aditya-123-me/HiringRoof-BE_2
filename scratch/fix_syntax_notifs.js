const fs = require('fs');

const filePath = 'E:/Anb_Carfts_Projects/Target CV/HVProject/HiringRoof/HiringRoofWorkingDir/HiringRoof-BE_2_Old/app/controllers/jobApplication.controller.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix doInterviewSelect syntax
content = content.replace(
	`const data = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applicantId,
			title: \`\${updatedApplication.jobId.companyName}\`,
			desc: \`You have been selected for interview for the \${updatedApplication.jobId.jobTittle} job on \${updatedApplication.interviewsDate} at \${updatedApplication.interviewsTime}\`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(\`notifications_\${data.receiverId._id}\`, data);

		const data2 = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applierId,
			title: \`\${updatedApplication.jobId.jobTittle}\`,
			desc: \`You schedule first round of interview with \${updatedApplication.applicantId.name} for \${updatedApplication.jobId.jobTittle} job on \${updatedApplication.interviews2Date} at \${updatedApplication.interviewsTime}\`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(\`notifications_\${data2.receiverId._id}\`, data2);

		return res.status(200).send({ status: true, await notifyStageEvent({
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

		msg: "Application updated for interview !!", data: updatedApplication });`,

	`await notifyStageEvent({
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

		return res.status(200).send({ status: true, msg: "Application updated for interview !!", data: updatedApplication });`
);

// Fix doInterview2Select syntax
content = content.replace(
	`const data = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applicantId,
			title: \`\${updatedApplication.jobId.companyName}\`,
			desc: \`You are selected for a second round of interviews for the \${updatedApplication.jobId.jobTittle} job on \${req.body.interviews2Date} at \${updatedApplication.interviews2Time}\`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(\`notifications_\${data.receiverId._id}\`, data);

		const data2 = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applierId,
			title: \`\${updatedApplication.jobId.jobTittle}\`,
			desc: \`You schedule second round of interview with \${updatedApplication.applicantId.name} for \${updatedApplication.jobId.jobTittle} job on \${updatedApplication.interviews2Date} at \${updatedApplication.interviews2Time}\`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(\`notifications_\${data2.receiverId._id}\`, data2);

		return res.status(200).send({ status: true, await notifyStageEvent({
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

		msg: "Application updated for interview 2 !!", data: updatedApplication });`,

	`await notifyStageEvent({
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

		return res.status(200).send({ status: true, msg: "Application updated for interview 2 !!", data: updatedApplication });`
);

// Fix selected syntax
content = content.replace(
	`const data = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applicantId,
			title: \`\${updatedApplication.jobId.companyName}\`,
			desc: \`You have been selected for the \${updatedApplication.jobId.jobTittle} job\`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(\`notifications_\${data.receiverId._id}\`, data);

		const data2 = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applierId,
			title: \`\${updatedApplication.jobId.jobTittle}\`,
			desc: \`You selected \${updatedApplication.applicantId.name} for \${updatedApplication.jobId.jobTittle} job\`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(\`notifications_\${data2.receiverId._id}\`, data2);

		return res.status(200).send({ status: true, await notifyStageEvent({
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

		msg: "Application updated for selected !!", data: updatedApplication });`,

	`await notifyStageEvent({
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

		return res.status(200).send({ status: true, msg: "Application updated for selected !!", data: updatedApplication });`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully fixed notification syntax!");
