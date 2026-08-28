const adminUserModel = require("../models/adminUser.model");
const RejectedInterview = require("../models/rejected.model");
const { imageUpload } = require("../util/googleDrive.util");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/config");
const jobModel = require("../models/job.model");
const JobApplication = require("../models/jobApplication.model");
const User = require("../models/user.model");
const createNotification = require("../util/createNotification");
const getProfileImages = require("../util/getprofileImages");
const { ObjectId } = require("mongoose").Types;

const superAdmin = {};

superAdmin.adminLogin = async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await adminUserModel.findOne({ email, password, type: { $in: ["superAdmin", "admin"] } });
		if (!user) return res.status(404).send({ status: false, msg: "Invalid Email or Password !!", data: [] });
		if (user.type === "hr")
			return res.status(404).send({ status: false, msg: "You don't have access to login !!", data: [] });

		if (user.isDeleted) return res.status(404).send({ status: false, msg: "This account has been deleted.", data: [] });

		if (!user.isActive)
			return res
				.status(404)
				.send({ status: false, msg: "This account is disabled, please contact  the administrator.", data: [] });

		const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: "60d" });

		return res.status(200).send({ status: true, msg: "User Login Successfully !!", data: user, token });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

superAdmin.getFeedbackDescending = async (req, res) => {
	try {
		let { hrId, month } = req.query;
		// Validate the format of the month parameter
		if (!isValidMonthFormat(month))
			return res.status(400).json({ message: "Invalid month format. Please provide month in YYYY-MM format." });

		// If hrId is not provided, set it to undefined so that all HRs will be considered
		if (hrId === "") hrId = undefined;

		// Parse the month parameter to create the start and end dates of the month
		const [year, monthNum] = month.split("-");
		const startDate = new Date(year, monthNum - 1, 1); // Month is zero-indexed in JavaScript
		const endDate = new Date(year, monthNum, 0);

		// Query the job applications where feedback is given by the HR and updated within the same month
		const jobApplications = await JobApplication.find({
			"feedback.givenBy": hrId,
			updatedAt: { $gte: startDate, $lt: endDate },
		}).populate("applicantId applierId jobId");

		// Query the HR details
		const hrDetails = await adminUserModel.findById(hrId);
		// Update each job application with HR details
		const populatedJobApplications = jobApplications.map((application) => ({
			...application.toObject(),
			feedback: {
				...application.feedback,
				givenBy: hrDetails, // Assuming you want to replace givenBy with HR details
			},
			hrDetails: hrDetails,
		}));

		res.json({
			status: true,
			msg: "Here are the listed employees with interviews passed date !!",
			data: populatedJobApplications,
		});
	} catch (error) {
		console.error("Error populating job applications:", error);
		res.status(500).json({ status: false, msg: "Internal server error" });
	}
};

// Function to validate month format (YYYY-MM)
function isValidMonthFormat(month) {
	const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
	return regex.test(month);
}

superAdmin.getInterviewsHistory = async (req, res) => {
	try {
		const { hrId, interviewField, month, InterviewDone, RescheduledInterview, status } = req.query;

		let jobApplications;
		if (hrId && ObjectId.isValid(hrId)) {
			const hr = await adminUserModel.findById(hrId);
			if (!hr) {
				return res.status(404).json({ status: false, msg: "HR not found!" });
			}
			const jobIds = hr.jobTarget.flatMap((target) => target.jobIds.map((idObj) => idObj.jobId));
			jobApplications = await JobApplication.find({
				jobId: { $in: jobIds },
			}).populate("applicantId applierId jobId");
		} else {
			// Fetch all job applications across all jobs in the system
			jobApplications = await JobApplication.find().populate("applicantId applierId jobId");
		}

		const hrs = await adminUserModel.find({ $or: [{ type: "hr" }, { type: "admin" }] });
		const jobToHrMap = {};
		hrs.forEach(hr => {
			if (hr.jobTarget) {
				hr.jobTarget.forEach(target => {
					if (target.jobIds) {
						target.jobIds.forEach(idObj => {
							if (idObj.jobId) {
								jobToHrMap[idObj.jobId.toString()] = hr;
							}
						});
					}
				});
			}
		});

		const currentDate = new Date(); // Get the current date/time
		currentDate.setHours(0, 0, 0, 0);

		// Filter for interview dates
		const passedInterviews = jobApplications.filter((application) => {
			const dateStr = application[`${interviewField}Date`];
			if (!dateStr) return false;

			const interviewDate = new Date(dateStr);
			if (isNaN(interviewDate.getTime())) return false;

			// Verify month if provided
			if (month && month !== "all" && month !== "") {
				if ((interviewDate.getMonth() + 1) !== parseInt(month)) {
					return false;
				}
			}

			// Check interviewPending states
			let isPendingInRound = false;
			if (interviewField === "interviews2") {
				isPendingInRound = application.interviewStatus && application.interviewStatus["interview2Pending"] === true;
			} else {
				isPendingInRound = application.interviewStatus && application.interviewStatus["interviewPending"] === true;
			}

			// Check if evaluated
			let isEvaluated = false;
			if (interviewField === "interviews2") {
				isEvaluated = application.interviewStatus && application.interviewStatus["interview2Pending"] === false;
			} else {
				isEvaluated = application.interviewStatus && application.interviewStatus["interviewPending"] === false;
			}

			const isRescheduled = application.rescheduledInterviews && application.rescheduledInterviews.length > 0;
			const isUpcoming = interviewDate >= currentDate && !isEvaluated;
			const isOverduePending = interviewDate < currentDate && isPendingInRound;

			// Apply status filter
			if (status === "upcoming") {
				return isUpcoming;
			} else if (status === "done") {
				return isEvaluated;
			} else if (status === "pending") {
				return isOverduePending;
			} else if (status === "rescheduled") {
				return isRescheduled;
			} else if (status === "all") {
				return true;
			}

			// Fallback to legacy checks if no status is specified
			const interviewDoneInMonth =
				(application.interviewStatus.timestamp1 &&
					new Date(application.interviewStatus.timestamp1).getMonth() === parseInt(month) - 1) ||
				(application.interviewStatus.timestamp2 &&
					new Date(application.interviewStatus.timestamp2).getMonth() === parseInt(month) - 1);

			return (
				isPendingInRound &&
				interviewDate < new Date() &&
				(InterviewDone === "true" ? interviewDoneInMonth : true) &&
				(RescheduledInterview === "true" ? isRescheduled : true)
			);
		});

		// Add HR details to each application/job
		const hrDetails = passedInterviews.map((application) => {
			const jobIdStr = application.jobId ? application.jobId._id.toString() : "";
			return {
				...application.toObject(),
				hr_detail: jobToHrMap[jobIdStr] || null,
			};
		});

		return res.status(200).send({
			status: true,
			msg: "Interviews history list fetched successfully!",
			data: hrDetails,
		});
	} catch (error) {
		console.error("Error in superAdmin.getInterviewsHistory:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

superAdmin.getJobTargetsSuperAdmin = async (req, res) => {
	try {
		const { month, year } = req.query;

		// Find all HR documents and project only required fields
		const allHR = await adminUserModel.find(
			{ type: "hr" },
			{ userId: 1, type: 1, profileImage: 1, name: 1, _id: 1, jobTarget: 1 }
		);

		// Initialize objects to store assigned and pending targets
		const assignedTargets = [];
		const pendingTargets = [];

		// Separate job targets for all HR into Assigned and Pending
		allHR.forEach((hr) => {
			if (hr.jobTarget) {
				// Check if jobTarget array exists
				const monthTarget = hr.jobTarget.find(
					(target) => target.month.toLowerCase() === month.toLowerCase() && target.year === year
				);
				if (!monthTarget) {
					// If month target doesn't exist, add to pendingTargets
					pendingTargets.push({
						hrId: hr._id,
						userId: hr.userId,
						type: hr.type,
						profileImage: hr.profileImage,
						name: hr.name,
						targets: { jobsDone: 0, jobsTarget: 0 },
					});
				} else {
					const hrTargets = {
						hrId: hr._id,
						userId: hr.userId,
						type: hr.type,
						profileImage: hr.profileImage,
						name: hr.name,
						targets: {
							month: monthTarget.month,
							year: monthTarget.year,
							_id: monthTarget._id,
							jobsDone: monthTarget.jobsDone,
							jobsTarget: monthTarget.jobsTarget,
						},
					};
					// If month target exists, add to assignedTargets
					assignedTargets.push(hrTargets);
				}
			} else {
				// If jobTarget doesn't exist at all, add to pendingTargets
				pendingTargets.push({
					hrId: hr._id,
					userId: hr.userId,
					type: hr.type,
					profileImage: hr.profileImage,
					name: hr.name,
					targets: { jobsDone: 0, jobsTarget: 0 },
				});
			}
		});

		// Construct the final response
		const response = {
			status: true,
			msg: "Job targets found",
			data: { assignedTargets, pendingTargets },
		};

		return res.status(200).json(response);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

superAdmin.getStatistics = async (req, res) => {
	try {
		// Calculate total values for HRs
		const hrStats = await adminUserModel.aggregate([
			{
				$match: { type: "hr" },
			},
			{
				$group: {
					_id: null,
					totalJobsAssigned: { $sum: "$totalJobsAssigned" },
					interviewScheduled: { $sum: "$interviewScheduled" },
					interviewTaken: { $sum: "$interviewTaken" },
					totalHired: { $sum: "$totalHired" },
				},
			},
		]);

		// Calculate count of jobSeekers
		const jobSeekerCount = await User.countDocuments({ userType: "jobSeeker" });

		// Calculate count of companyRecruiters
		const companyCount = await User.countDocuments({ userType: { $in: ["individualRecruiter", "companyRecruiter"] } });

		// Prepare response
		const statistics = {
			...(hrStats[0] || {}), // If no HRs found, initialize with empty object
			jobSeekerCount: jobSeekerCount,
			companyCount: companyCount,
		};

		// Send response
		res.status(200).json({
			status: true,
			msg: "Statistics retrieved successfully",
			data: statistics,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ status: false, msg: "Internal server error" });
	}
};

superAdmin.getManualPayments = async (req, res) => {
	try {
		const serviceModel = require("../models/service.model");
		const status = req.query.status;
		const query = status && status !== "ALL" ? { paymentStatus: status } : {};
		const payments = await serviceModel.find(query)
			.populate("userId", "name email phone profileImage userType")
			.sort({ createdAt: -1 });

		return res.status(200).json({ status: true, count: payments.length, data: payments });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

superAdmin.verifyManualPayment = async (req, res) => {
	try {
		const serviceModel = require("../models/service.model");
		const jobModel = require("../models/job.model");
		const { id } = req.params;
		const { action, rejectionReason } = req.body;

		const service = await serviceModel.findById(id);
		if (!service) return res.status(404).json({ status: false, msg: "Payment record not found!" });

		// Check if this service is a job addon payment
		let isJobAddon = false;
		let jobId = null;
		if (service.merchantTransactionId && service.merchantTransactionId.startsWith("MANUAL_JOB_ADDON_")) {
			isJobAddon = true;
			jobId = service.merchantTransactionId.replace("MANUAL_JOB_ADDON_", "");
		}


		if (action === "APPROVE") {
			service.paymentStatus = "APPROVED";
			service.isPaymentSuccess = true;
			service.isActive = true; 

			if (isJobAddon && jobId) {
				const approvalDate = new Date();
				const serviceDateStr = approvalDate.toISOString().split("T")[0];

				const jobExpireDate = new Date();
				jobExpireDate.setDate(jobExpireDate.getDate() + 1); // 1 day validity/expiry
				const jobExpireStr = jobExpireDate.toISOString().split("T")[0];

				await jobModel.findByIdAndUpdate(jobId, {
					$set: { 
						isPaymentSuccess: true, 
						isActive: true,
						expireDate: jobExpireStr
					}
				});

				// Update service date & expireDate to align with active window
				service.date = serviceDateStr;
				service.expireDate = jobExpireStr;
			}
			await service.save();

			// Trigger invoice PDF generation, upload & email delivery in background
			try {
				const { generateInvoice } = require("./invoice.controller");
				const mockReq = { params: { merchantTransactionId: service.merchantTransactionId }, user: { _id: service.userId } };
				const mockRes = { headersSent: true, status: () => ({ json: () => {} }), send: () => {} };
				await generateInvoice(mockReq, mockRes);
			} catch (invErr) {
				console.error("Error generating invoice on manual payment approval:", invErr.message);
			}

			return res.status(200).json({ status: true, msg: "Manual payment approved successfully!", data: service });
		} else if (action === "REJECT") {
			service.paymentStatus = "REJECTED";
			service.isPaymentSuccess = false;
			service.isActive = false;
			service.rejectionReason = rejectionReason || "Payment verification failed";
			await service.save();

			if (isJobAddon && jobId) {
				await jobModel.findByIdAndUpdate(jobId, {
					$set: { isPaymentSuccess: false, isActive: false }
				});
			}

			return res.status(200).json({ status: true, msg: "Manual payment rejected!", data: service });
		} else {
			return res.status(400).json({ status: false, msg: "Invalid action! Use APPROVE or REJECT." });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

superAdmin.getPendingAddonJobs = async (req, res) => {
	try {
		const serviceModel = require("../models/service.model");
		const jobModel = require("../models/job.model");
		
		const status = req.query.status;
		const query = { merchantTransactionId: { $regex: /^MANUAL_JOB_ADDON_/ } };
		if (status && status !== "ALL") query.paymentStatus = status;

		const payments = await serviceModel.find(query)
		.populate("userId", "name email phone profileImage userType")
		.sort({ createdAt: -1 })
		.lean();

		// Fetch and attach job details for each pending payment
		const results = await Promise.all(
			payments.map(async (payment) => {
				const jobId = payment.merchantTransactionId.replace("MANUAL_JOB_ADDON_", "");
				const jobDetails = await jobModel.findById(jobId).lean();
				return {
					...payment,
					jobDetails
				};
			})
		);

		return res.status(200).json({ status: true, count: results.length, data: results });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

/**
 * POST /superAdmin/toggle-badge
 * Body: { userId, badge }
 * badge = "" to remove badge, or any label string to assign it
 * SuperAdmin-only: assigns/removes a custom badge label to a candidate
 */
superAdmin.toggleCandidateBadge = async (req, res) => {
	try {
		const { userId, badge } = req.body;

		if (!userId) {
			return res.status(400).json({ status: false, msg: "userId is required" });
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ status: false, msg: "Candidate not found" });
		}

		// Toggle: if same badge is sent again, remove it. Otherwise assign the new one.
		const newBadge = user.badge === badge && badge !== "" ? "" : (badge || "");

		user.badge = newBadge;
		await user.save();

		return res.status(200).json({
			status: true,
			msg: newBadge ? `Badge "${newBadge}" assigned successfully` : "Badge removed successfully",
			badge: newBadge,
			user: { _id: user._id, name: user.name, badge: user.badge, status: user.status },
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};
 
/**
 * PUT /superAdmin/set-candidate-status
 * Body: { userId, status }
 * status: "Applied" | "Shortlisted" | "Interview 1" | "Interview 2" | "Selected" | "Rejected"
 * SuperAdmin-level status update — bypasses stage-order enforcement
 */
superAdmin.setCandidateStatus = async (req, res) => {
	try {
		const { userId, status } = req.body;

		const VALID_STATUSES = ["Applied", "Shortlisted", "Interview 1", "Interview 2", "Selected", "Rejected"];

		if (!userId) return res.status(400).json({ status: false, msg: "userId is required" });
		if (!status || !VALID_STATUSES.includes(status)) {
			return res.status(400).json({
				status: false,
				msg: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
			});
		}

		const user = await User.findByIdAndUpdate(
			userId,
			{ $set: { status, response: status } },
			{ new: true }
		);

		if (!user) return res.status(404).json({ status: false, msg: "Candidate not found" });

		return res.status(200).json({
			status: true,
			msg: `Candidate status updated to "${status}"`,
			user: { _id: user._id, name: user.name, status: user.status, badge: user.badge },
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

/**
 * GET /superAdmin/candidates-by-status?status=Selected&page=1&limit=20
 * Returns all candidates filtered by their pipeline status
 */
superAdmin.getCandidatesByStatus = async (req, res) => {
	try {
		const { status, page = 1, limit = 20 } = req.query;

		const VALID_STATUSES = ["Applied", "Shortlisted", "Interview 1", "Interview 2", "Selected", "Rejected"];
		const filter = { userType: "jobSeeker" };

		if (status) {
			if (!VALID_STATUSES.includes(status)) {
				return res.status(400).json({ status: false, msg: `Invalid status filter` });
			}
			filter.status = status;
		}

		const skip = (Number(page) - 1) * Number(limit);
		const [candidates, total] = await Promise.all([
			User.find(filter)
				.select("name email phone profileImage profession location status badge response isHired createdAt")
				.skip(skip)
				.limit(Number(limit))
				.sort({ updatedAt: -1 }),
			User.countDocuments(filter),
		]);

		return res.status(200).json({
			status: true,
			total,
			page: Number(page),
			pages: Math.ceil(total / Number(limit)),
			data: candidates,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

/**
 * PUT /superAdmin/candidate-selection
 * Body: { userId, selectedBadge, jobIdToPush, jobIdToRemove }
 * Allows SuperAdmin to manually override the global selection badge and history
 */
superAdmin.updateCandidateSelection = async (req, res) => {
	try {
		const { userId, selectedBadge, jobIdToPush, jobIdToRemove } = req.body;

		if (!userId) {
			return res.status(400).json({ status: false, msg: "userId is required" });
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ status: false, msg: "Candidate not found" });
		}

		const updateOps = {};

		if (selectedBadge !== undefined) {
			const isTrue = Boolean(selectedBadge);
			updateOps.$set = { selectedBadge: isTrue };
			if (isTrue) {
				updateOps.$inc = { selectionCount: 1 };
			} else {
				updateOps.$inc = { badgeRemovedCount: 1 };
			}
		}

		if (jobIdToPush && mongoose.Types.ObjectId.isValid(jobIdToPush)) {
			updateOps.$addToSet = { selectedIn: { job: jobIdToPush, date: new Date() } };
			if (!updateOps.$inc) updateOps.$inc = {};
			updateOps.$inc.selectionCount = 1;
		}

		if (jobIdToRemove && mongoose.Types.ObjectId.isValid(jobIdToRemove)) {
			updateOps.$pull = { selectedIn: { job: jobIdToRemove } };
		}

		const updatedUser = await User.findByIdAndUpdate(
			userId,
			updateOps,
			{ new: true }
		).select("name email selectedBadge selectedIn");

		return res.status(200).json({
			status: true,
			msg: "Candidate selection updated successfully",
			data: updatedUser
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

/**
 * GET /superAdmin/service-orders
 * Fetches all candidate & recruiter service purchases with filters for fulfillment & HR assignment
 */
superAdmin.getServiceOrders = async (req, res) => {
	try {
		const serviceModel = require("../models/service.model");
		const { fulfillmentStatus, hrId, serviceCategory, page = 1, limit = 20 } = req.query;

		const filter = {
			paymentStatus: { $ne: "REJECTED" },
		};

		if (fulfillmentStatus && fulfillmentStatus !== "ALL") {
			filter.fulfillmentStatus = fulfillmentStatus;
		}

		if (hrId && hrId !== "ALL") {
			filter.assignedHR = hrId;
		}

		if (serviceCategory && serviceCategory !== "ALL") {
			filter.serviceCategory = serviceCategory;
		}

		const skip = (Number(page) - 1) * Number(limit);

		const [services, total] = await Promise.all([
			serviceModel.find(filter)
				.populate("userId", "name email phone profileImage userType")
				.populate("assignedHR", "name email number profileImage")
				.populate("assignedBy", "name email")
				.populate("addonId")
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(Number(limit)),
			serviceModel.countDocuments(filter),
		]);

		return res.status(200).json({
			status: true,
			total,
			page: Number(page),
			pages: Math.ceil(total / Number(limit)),
			data: services,
		});
	} catch (error) {
		console.error("Error in getServiceOrders:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

/**
 * PUT /superAdmin/assign-service-hr
 * Assigns or reassigns an HR Admin to a purchased service order & initializes conversation room
 */
superAdmin.assignServiceHR = async (req, res, io) => {
	try {
		const serviceModel = require("../models/service.model");
		const conversationModel = require("../models/conversation.model");
		const adminUserModel = require("../models/adminUser.model");
		const createNotification = require("../util/createNotification");

		const { serviceId, hrId } = req.body;

		if (!serviceId || !hrId) {
			return res.status(400).json({ status: false, msg: "serviceId and hrId are required!" });
		}

		const service = await serviceModel.findById(serviceId).populate("userId");
		if (!service) {
			return res.status(404).json({ status: false, msg: "Service order not found!" });
		}

		const hrAdmin = await adminUserModel.findById(hrId);
		if (!hrAdmin) {
			return res.status(404).json({ status: false, msg: "HR Admin not found!" });
		}

		// 1. Update Service Record
		service.assignedHR = hrId;
		service.assignedBy = req.user._id;
		service.assignedAt = new Date();
		service.fulfillmentStatus = "ASSIGNED";
		service.paymentStatus = "APPROVED";
		await service.save();

		// 2. Initialize / Get Conversation Room
		const roomId = `hr_${hrId}_user_${service.userId._id}_service_${serviceId}`;

		let conversation = await conversationModel.findOne({ roomId });
		if (!conversation) {
			conversation = await conversationModel.create({
				roomId,
				conversationType: "service",
				hrId,
				userId: service.userId._id,
				recruiterId: service.userId._id,
				serviceId: service._id,
				lastMessage: `Service fulfillment thread started for "${service.serviceData?.title || "Service Order"}"`,
				lastMessageAt: new Date(),
			});
		} else {
			conversation.hrId = hrId;
			await conversation.save();
		}

		// 3. Optional: Push in-app notifications
		try {
			if (createNotification && io) {
				const userNotif = await createNotification({
					senderId: hrId,
					receiverId: service.userId._id,
					title: "HR Assigned for Your Service",
					desc: `${hrAdmin.name} has been assigned to assist with your "${service.serviceData?.title || "service"}". You can now chat directly!`,
					logo: hrAdmin.profileImage || "",
				});
				io.emit(`notifications_${service.userId._id}`, userNotif);
			}
		} catch (notifErr) {
			console.log("Notification error skipped:", notifErr.message);
		}

		return res.status(200).json({
			status: true,
			msg: `Service assigned to ${hrAdmin.name} successfully!`,
			data: {
				service,
				conversation,
				roomId,
			},
		});
	} catch (error) {
		console.error("Error in assignServiceHR:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

/**
 * GET /superAdmin/all-conversations
 * Allows Super Admin to view, search, and monitor all platform chat conversations
 * Query Params: { conversationType: "ALL"|"job"|"service", hrId, search, page, limit }
 */
superAdmin.getAllConversations = async (req, res) => {
	try {
		const conversationModel = require("../models/conversation.model");
		const { conversationType, hrId, search, page = 1, limit = 20 } = req.query;

		const filter = {};

		// Filter by conversation type (job hiring or service fulfillment)
		if (conversationType && conversationType !== "ALL") {
			filter.conversationType = conversationType;
		}

		// Filter by assigned HR Admin
		if (hrId && hrId !== "ALL") {
			filter.hrId = hrId;
		}

		const skip = (Number(page) - 1) * Number(limit);

		let conversationsQuery = conversationModel.find(filter)
			.populate("hrId", "name email number phone profileImage")
			.populate("userId", "name email phone profileImage userType companyName")
			.populate("recruiterId", "name email profileImage companyName")
			.populate("jobId", "jobTittle companyName companyLogo location vacancies")
			.populate({
				path: "serviceId",
				populate: { path: "addonId", select: "title amount type" }
			})
			.sort({ lastMessageAt: -1 })
			.skip(skip)
			.limit(Number(limit));

		const [conversations, total] = await Promise.all([
			conversationsQuery,
			conversationModel.countDocuments(filter),
		]);

		// Optional in-memory search filtering by participant or job/service name
		let filteredData = conversations;
		if (search && search.trim()) {
			const s = search.trim().toLowerCase();
			filteredData = conversations.filter((c) => {
				const hrName = c.hrId?.name?.toLowerCase() || "";
				const userName = c.userId?.name?.toLowerCase() || "";
				const userEmail = c.userId?.email?.toLowerCase() || "";
				const jobTitle = c.jobId?.jobTittle?.toLowerCase() || "";
				const serviceTitle = c.serviceId?.serviceData?.title?.toLowerCase() || "";
				return (
					hrName.includes(s) ||
					userName.includes(s) ||
					userEmail.includes(s) ||
					jobTitle.includes(s) ||
					serviceTitle.includes(s)
				);
			});
		}

		return res.status(200).json({
			status: true,
			total,
			page: Number(page),
			pages: Math.ceil(total / Number(limit)),
			data: filteredData,
		});
	} catch (error) {
		console.error("Error in getAllConversations:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

/**
 * GET /superAdmin/conversation-messages/:roomId
 * Allows Super Admin to view complete message history of any conversation room
 */
superAdmin.getConversationMessages = async (req, res) => {
	try {
		const messageModel = require("../models/message.model");
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
		console.error("Error in getConversationMessages:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = superAdmin;
