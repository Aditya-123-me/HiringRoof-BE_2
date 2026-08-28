const mongoose = require("mongoose");
const conversationModel = require("../models/conversation.model");
const messageModel = require("../models/message.model");
const jobModel = require("../models/job.model");
const adminUserModel = require("../models/adminUser.model");
const userModel = require("../models/user.model");

const chatController = {};

// Get or create conversation room between HR, Recruiter, and Job
chatController.getOrCreateRoom = async (req, res) => {
	try {
		let { jobId, hrId, recruiterId } = req.body;

		// Detect caller role
		const isHR = req.user.type === "hr" || req.user.type === "admin" || req.user.type === "sub-admin";
		if (isHR && !hrId) hrId = req.user._id.toString();
		if (!isHR && !recruiterId) recruiterId = req.user._id.toString();

		if (!jobId) {
			return res.status(400).json({ status: false, msg: "Job ID is required!" });
		}

		// If HR is missing, look up assigned HR for this job
		if (!hrId) {
			const assignedAdmin = await adminUserModel.findOne({
				"jobTarget.jobIds.jobId": jobId,
				isDeleted: { $ne: true }
			}).select("_id");
			if (assignedAdmin) {
				hrId = assignedAdmin._id.toString();
			}
		}

		// If Recruiter is missing, look up job poster
		if (!recruiterId) {
			const job = await jobModel.findById(jobId).select("userId");
			if (job && job.userId) {
				recruiterId = job.userId.toString();
			}
		}

		if (!hrId || !recruiterId) {
			return res.status(400).json({ status: false, msg: "HR ID and Recruiter ID could not be resolved for this job!" });
		}

		const roomId = `hr_${hrId}_recruiter_${recruiterId}_job_${jobId}`;

		let conversation = await conversationModel.findOne({ roomId })
			.populate("hrId", "name email number profileImage")
			.populate("recruiterId", "name email profileImage companyName")
			.populate("jobId", "jobTittle companyName companyLogo location");

		if (!conversation) {
			const newConv = await conversationModel.create({
				roomId,
				hrId,
				recruiterId,
				jobId,
				lastMessage: "Conversation started",
				lastMessageAt: new Date(),
			});

			conversation = await conversationModel.findById(newConv._id)
				.populate("hrId", "name email number profileImage")
				.populate("recruiterId", "name email profileImage companyName")
				.populate("jobId", "jobTittle companyName companyLogo location");
		}

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

// Get all conversations for logged in user (HR or Recruiter)
chatController.getConversations = async (req, res) => {
	try {
		const userId = req.user._id;
		const isHR = req.user.type === "hr" || req.user.type === "admin" || req.user.type === "sub-admin";

		const query = isHR ? { hrId: userId } : { recruiterId: userId };

		const conversations = await conversationModel.find(query)
			.populate("hrId", "name email number profileImage")
			.populate("recruiterId", "name email profileImage companyName")
			.populate("jobId", "jobTittle companyName companyLogo location vacancies")
			.sort({ lastMessageAt: -1 });

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

module.exports = chatController;
