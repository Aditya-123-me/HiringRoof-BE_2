const mongoose = require("mongoose");
const conversationModel = require("../models/conversation.model");
const messageModel = require("../models/message.model");
const jobModel = require("../models/job.model");
const adminUserModel = require("../models/adminUser.model");
const userModel = require("../models/user.model");

const chatController = {};

// Get or create conversation room (supports both Job and Service orders)
chatController.getOrCreateRoom = async (req, res) => {
	try {
		let { jobId, serviceId, hrId, recruiterId, userId } = req.body;

		// Detect caller role
		const isHR = req.user.type === "hr" || req.user.type === "admin" || req.user.type === "sub-admin";
		if (isHR && !hrId) hrId = req.user._id.toString();
		
		const targetUserId = userId || recruiterId || (isHR ? null : req.user._id.toString());

		// ----------------------------------------------------
		// A. RESOLVE RECRUITER & HR IDS
		// ----------------------------------------------------
		let finalUserId = targetUserId;
		let finalHrId = hrId;

		if (serviceId) {
			const serviceModel = require("../models/service.model");
			const service = await serviceModel.findById(serviceId).populate("userId").populate("assignedHR");
			if (service) {
				if (!finalUserId) finalUserId = service.userId?._id?.toString() || service.userId?.toString();
				if (!finalHrId) finalHrId = service.assignedHR?._id?.toString() || service.assignedHR?.toString();
			}
		}

		if (jobId) {
			const job = await jobModel.findById(jobId).select("userId assignedHR");
			if (job) {
				if (!finalUserId && job.userId) finalUserId = job.userId.toString();
				if (!finalHrId && job.assignedHR) finalHrId = job.assignedHR.toString();
			}
		}

		if (!finalHrId && jobId) {
			const assignedAdmin = await adminUserModel.findOne({
				"jobTarget.jobIds.jobId": jobId,
				isDeleted: { $ne: true }
			}).select("_id");
			if (assignedAdmin) finalHrId = assignedAdmin._id.toString();
		}

		if (!finalHrId || !finalUserId) {
			return res.status(400).json({ status: false, msg: "HR ID and Recruiter ID could not be resolved!" });
		}

		// ----------------------------------------------------
		// B. SEARCH EXISTING CONVERSATION ROOM (SCOPED BY JOB / SERVICE)
		// ----------------------------------------------------
		const queryFilter = {
			hrId: finalHrId,
			$or: [{ userId: finalUserId }, { recruiterId: finalUserId }]
		};

		if (jobId) {
			queryFilter.jobId = jobId;
		} else if (serviceId) {
			queryFilter.serviceId = serviceId;
		}

		let conversation = await conversationModel.findOne(queryFilter)
			.populate("hrId", "name email number profileImage")
			.populate("recruiterId", "name email profileImage companyName")
			.populate("userId", "name email profileImage companyName userType phone")
			.populate("jobId", "jobTittle companyName companyLogo location")
			.populate("serviceId");

		// Fallback: If jobId was passed but conversation was created via service without jobId, update & reuse
		if (!conversation && jobId) {
			conversation = await conversationModel.findOne({
				hrId: finalHrId,
				$or: [{ userId: finalUserId }, { recruiterId: finalUserId }],
				$or: [{ jobId: null }, { jobId: { $exists: false } }]
			})
				.sort({ updatedAt: -1 })
				.populate("hrId", "name email number profileImage")
				.populate("recruiterId", "name email profileImage companyName")
				.populate("userId", "name email profileImage companyName userType phone")
				.populate("jobId", "jobTittle companyName companyLogo location")
				.populate("serviceId");

			if (conversation) {
				conversation.jobId = jobId;
				await conversation.save();
				conversation = await conversationModel.findById(conversation._id)
					.populate("hrId", "name email number profileImage")
					.populate("recruiterId", "name email profileImage companyName")
					.populate("userId", "name email profileImage companyName userType phone")
					.populate("jobId", "jobTittle companyName companyLogo location")
					.populate("serviceId");
			}
		}

		if (conversation) {
			return res.status(200).json({
				status: true,
				data: conversation,
				roomId: conversation.roomId,
			});
		}

		// ----------------------------------------------------
		// C. CREATE NEW CONVERSATION ROOM IF NONE EXISTS
		// ----------------------------------------------------
		const roomId = jobId
			? `hr_${finalHrId}_recruiter_${finalUserId}_job_${jobId}`
			: `hr_${finalHrId}_user_${finalUserId}_service_${serviceId || Date.now()}`;

		const newConv = await conversationModel.create({
			roomId,
			conversationType: serviceId ? "service" : "job",
			hrId: finalHrId,
			userId: finalUserId,
			recruiterId: finalUserId,
			jobId: jobId || null,
			serviceId: serviceId || null,
			lastMessage: "Conversation started",
			lastMessageAt: new Date(),
		});

		conversation = await conversationModel.findById(newConv._id)
			.populate("hrId", "name email number profileImage")
			.populate("recruiterId", "name email profileImage companyName")
			.populate("userId", "name email profileImage companyName userType phone")
			.populate("jobId", "jobTittle companyName companyLogo location")
			.populate("serviceId");

		return res.status(200).json({
			status: true,
			data: conversation,
			roomId,
		});
	} catch (error) {
		console.error("Error in chatController.getOrCreateRoom:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get all conversations for logged in user (HR or Candidate/Recruiter)
chatController.getConversations = async (req, res) => {
	try {
		const userId = req.user._id;
		const isHR = req.user.type === "hr" || req.user.type === "admin" || req.user.type === "sub-admin";

		const query = isHR 
			? { hrId: userId } 
			: { $or: [{ userId }, { recruiterId: userId }] };

		const rawConversations = await conversationModel.find(query)
			.populate("hrId", "name email number profileImage")
			.populate("userId", "name email profileImage companyName userType phone")
			.populate("recruiterId", "name email profileImage companyName")
			.populate("jobId", "jobTittle companyName companyLogo location vacancies")
			.populate("serviceId")
			.sort({ lastMessageAt: -1 });

		const conversations = await Promise.all(
			rawConversations.map(async (convDoc) => {
				const conv = convDoc.toObject();
				if (!conv.jobId) {
					const rId = conv.userId?._id || conv.recruiterId?._id || conv.userId || conv.recruiterId;
					if (rId) {
						const sType = conv.serviceId?.serviceType || conv.serviceId?.serviceData?.title || "";
						let matchJob = null;
						if (sType) {
							const cleanType = sType.replace(/hiring/i, "").trim();
							const regex = new RegExp(cleanType || "Immediate", "i");
							matchJob = await jobModel.findOne({
								userId: rId,
								$or: [{ serviceType: regex }, { "addOn.name": regex }, { "addOn.title": regex }],
								isDeleted: { $ne: true }
							}).select("jobTittle companyName companyLogo location vacancies").lean();
						}
						if (!matchJob) {
							matchJob = await jobModel.findOne({ userId: rId, isDeleted: { $ne: true } })
								.sort({ createdAt: -1 })
								.select("jobTittle companyName companyLogo location vacancies").lean();
						}

						if (matchJob) {
							conv.jobId = matchJob;
							await conversationModel.findByIdAndUpdate(conv._id, { jobId: matchJob._id }).catch(() => {});
						}
					}
				}
				return conv;
			})
		);

		return res.status(200).json({
			status: true,
			data: conversations,
		});
	} catch (error) {
		console.error("Error in chatController.getConversations:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get message history for a specific roomId
chatController.getMessages = async (req, res) => {
	try {
		const { roomId } = req.params;
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 100;
		const skip = (page - 1) * limit;

		const messages = await messageModel.find({ roomId })
			.sort({ createdAt: 1 })
			.skip(skip)
			.limit(limit);

		return res.status(200).json({
			status: true,
			data: messages,
		});
	} catch (error) {
		console.error("Error in chatController.getMessages:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Send message via REST API
chatController.sendMessage = async (req, res) => {
	try {
		const { roomId, text, attachments } = req.body;
		if (!roomId || !text?.trim()) {
			return res.status(400).json({ status: false, msg: "Room ID and text are required!" });
		}

		const conversation = await conversationModel.findOne({ roomId });
		if (!conversation) {
			return res.status(404).json({ status: false, msg: "Conversation not found!" });
		}

		const isHR = req.user.type === "hr" || req.user.type === "admin" || req.user.type === "sub-admin";
		const senderType = isHR ? "hr" : "recruiter";

		const message = await messageModel.create({
			conversationId: conversation._id,
			roomId,
			senderId: req.user._id,
			senderType,
			text: text.trim(),
			attachments: Array.isArray(attachments) ? attachments : [],
		});

		// Update conversation last message & increment unread counter for the counter-party
		const updateData = {
			lastMessage: text.trim(),
			lastMessageAt: new Date(),
		};
		if (isHR) {
			updateData.$inc = { unreadCountRecruiter: 1 };
		} else {
			updateData.$inc = { unreadCountHR: 1 };
		}

		await conversationModel.findByIdAndUpdate(conversation._id, updateData);

		return res.status(200).json({
			status: true,
			data: message,
		});
	} catch (error) {
		console.error("Error in chatController.sendMessage:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Mark conversation messages as read
chatController.markAsRead = async (req, res) => {
	try {
		const { roomId } = req.params;
		const isHR = req.user.type === "hr" || req.user.type === "admin" || req.user.type === "sub-admin";

		const updateConv = isHR ? { unreadCountHR: 0 } : { unreadCountRecruiter: 0 };
		await conversationModel.findOneAndUpdate({ roomId }, updateConv);

		await messageModel.updateMany({ roomId, isRead: false }, { isRead: true });

		return res.status(200).json({
			status: true,
			msg: "Marked as read successfully!",
		});
	} catch (error) {
		console.error("Error in chatController.markAsRead:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Fetch unique recruiters assigned to the HR Admin (grouped with their assigned jobs and services)
chatController.getAssignedRecruiters = async (req, res) => {
	try {
		const hrId = req.user._id;

		const recruiterMap = new Map();

		const getOrInitRecruiter = (userObj) => {
			const idStr = userObj._id.toString();
			if (!recruiterMap.has(idStr)) {
				recruiterMap.set(idStr, {
					recruiter: userObj,
					jobs: new Map(),
					services: new Map()
				});
			}
			return recruiterMap.get(idStr);
		};

		// 1. Fetch recruiters from assigned services
		const serviceModel = require("../models/service.model");
		const assignedServices = await serviceModel.find({ assignedHR: hrId })
			.populate("userId", "name email profileImage companyName userType phone");

		assignedServices.forEach(service => {
			if (service.userId && service.userId.userType !== "jobSeeker") {
				const entry = getOrInitRecruiter(service.userId);
				entry.services.set(service._id.toString(), service);
			}
		});

		// 2. Fetch recruiters from assigned jobs
		const adminUser = await adminUserModel.findById(hrId);
		if (adminUser && adminUser.jobTarget) {
			const jobIds = [];
			adminUser.jobTarget.forEach(target => {
				if (target.jobIds) {
					target.jobIds.forEach(item => {
						if (item.jobId) {
							jobIds.push(item.jobId);
						}
					});
				}
			});

			if (jobIds.length > 0) {
				const assignedJobs = await jobModel.find({ _id: { $in: jobIds } })
					.populate("userId", "name email profileImage companyName userType phone");

				assignedJobs.forEach(job => {
					if (job.userId && job.userId.userType !== "jobSeeker") {
						const entry = getOrInitRecruiter(job.userId);
						entry.jobs.set(job._id.toString(), job);
					}
				});
			}
		}

		const result = Array.from(recruiterMap.values()).map(entry => ({
			recruiter: entry.recruiter,
			jobs: Array.from(entry.jobs.values()),
			services: Array.from(entry.services.values())
		}));

		return res.status(200).json({
			status: true,
			data: result,
		});
	} catch (error) {
		console.error("Error fetching assigned recruiters:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = chatController;
