const adminUserModel = require("../models/adminUser.model");
const serviceModel = require("../models/service.model");
const Job = require("../models/job.model");
const createNotification = require("./createNotification");

/**
 * Finds assigned HR ID for a job if available
 */
async function getAssignedHRId(job) {
	try {
		if (!job) return null;
		const jobId = job._id || job;

		// 1. Direct assignedHR on job
		const fullJob = job.assignedHR !== undefined ? job : await Job.findById(jobId).lean();
		if (!fullJob) return null;
		if (fullJob.assignedHR) return fullJob.assignedHR.toString();

		// 2. Check adminUserModel (jobTarget array)
		const hrAdmin = await adminUserModel.findOne({
			isDeleted: { $ne: true },
			type: { $in: ["hr", "admin", "sub-admin"] },
			"jobTarget.jobIds.jobId": fullJob._id
		}).select("_id").lean();
		if (hrAdmin) return hrAdmin._id.toString();

		// 3. Check serviceModel matching user
		if (fullJob.userId) {
			const activeService = await serviceModel.findOne({
				userId: fullJob.userId,
				assignedHR: { $exists: true, $ne: null }
			}).select("assignedHR").lean();
			if (activeService && activeService.assignedHR) return activeService.assignedHR.toString();
		}

		return null;
	} catch (err) {
		console.error("Error in getAssignedHRId:", err);
		return null;
	}
}

/**
 * Sends notifications to Candidate, Recruiter, and Assigned HR for any job application stage event
 */
async function notifyStageEvent({
	io,
	senderId,
	senderType = "user",
	candidateId,
	recruiterId,
	job,
	candidateMsg,
	recruiterMsg,
	hrMsg,
}) {
	try {
		const logo = job?.companyLogo || "";
		const companyName = job?.companyName || "Hiring Roof";
		const jobTitle = job?.jobTittle || "Job Opening";

		const cId = candidateId?._id ? candidateId._id.toString() : candidateId?.toString();
		const rId = recruiterId?._id ? recruiterId._id.toString() : recruiterId?.toString();
		const sId = senderId?._id ? senderId._id.toString() : senderId?.toString();

		// 1. Candidate Notification
		if (cId) {
			const candNotif = await createNotification({
				senderType,
				senderId: sId || rId,
				receiverType: "user",
				receiverId: cId,
				title: companyName,
				desc: candidateMsg,
				logo,
			});
			if (io && candNotif?.receiverId?._id) {
				io.emit(`notifications_${candNotif.receiverId._id}`, candNotif);
			}
		}

		// 2. Recruiter Notification
		if (rId && rId !== sId) {
			const recNotif = await createNotification({
				senderType,
				senderId: sId || cId,
				receiverType: "user",
				receiverId: rId,
				title: jobTitle,
				desc: recruiterMsg,
				logo,
			});
			if (io && recNotif?.receiverId?._id) {
				io.emit(`notifications_${recNotif.receiverId._id}`, recNotif);
			}
		}

		// 3. Assigned HR Notification
		const assignedHRId = await getAssignedHRId(job);
		if (
			assignedHRId &&
			assignedHRId !== sId &&
			assignedHRId !== rId
		) {
			const hrNotif = await createNotification({
				senderType,
				senderId: sId || cId,
				receiverType: "adminUser",
				receiverId: assignedHRId,
				title: `${jobTitle} (${companyName})`,
				desc: hrMsg || recruiterMsg,
				logo,
			});
			if (io && hrNotif?.receiverId?._id) {
				io.emit(`notifications_${hrNotif.receiverId._id}`, hrNotif);
			}
		}
	} catch (error) {
		console.error("Error in notifyStageEvent:", error);
	}
}

module.exports = { notifyStageEvent, getAssignedHRId };
