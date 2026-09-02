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
const userModel = require("../models/user.model");
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

		// Parse the month parameter to create the start and end dates of the month
		const [year, monthNum] = month.split("-");
		const startDate = new Date(year, monthNum - 1, 1); // Month is zero-indexed in JavaScript
		const endDate = new Date(year, monthNum, 0);
		endDate.setHours(23, 59, 59, 999);

		const filter = {
			updatedAt: { $gte: startDate, $lte: endDate },
			"feedback.givenBy": { $exists: true, $ne: null }
		};

		if (hrId && hrId !== "" && hrId !== "ALL" && hrId !== "undefined") {
			filter["feedback.givenBy"] = hrId;
		}

		// Query the job applications where feedback is given by the HR
		const jobApplications = await JobApplication.find(filter)
			.populate("applicantId applierId jobId")
			.sort({ updatedAt: -1 });

		// Populate each job application with HR details manually
		const populatedJobApplications = [];
		for (const application of jobApplications) {
			const appObj = application.toObject();
			const givenById = appObj.feedback?.givenBy;
			if (givenById) {
				const hr = await adminUserModel.findById(givenById)
					.select("name email number profileImage type")
					.lean();
				if (hr) {
					appObj.hrDetails = hr;
					if (appObj.feedback) {
						appObj.feedback.givenBy = hr;
					}
				}
			}
			populatedJobApplications.push(appObj);
		}

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

		// 1b. Update matching Job record in jobModel so recruiter profile sees assigned HR
		try {
			if (service.jobId) {
				await jobModel.findByIdAndUpdate(service.jobId, { assignedHR: hrId });
			} else {
				const sType = service.serviceType || service.serviceData?.title || service.addonId?.name || "";
				if (sType) {
					const cleanType = sType.replace(/hiring/i, "").trim();
					const regex = new RegExp(cleanType, "i");
					await jobModel.updateMany(
						{
							userId: service.userId._id,
							$or: [
								{ serviceType: regex },
								{ "addOn.name": regex },
								{ "addOn.title": regex }
							],
							isDeleted: { $ne: true }
						},
						{ $set: { assignedHR: hrId } }
					);
				} else {
					// Fallback: update latest active addon job for this user
					await jobModel.updateMany(
						{ userId: service.userId._id, isDeleted: { $ne: true } },
						{ $set: { assignedHR: hrId } }
					);
				}
			}
		} catch (jobUpdateErr) {
			console.log("Error updating job assignedHR:", jobUpdateErr.message);
		}

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

superAdmin.getPendingImmediateTags = async (req, res) => {
	try {
		const Job = require("../models/job.model");
		const pendingJobs = await Job.find({
			immediateTagRequest: "PENDING",
			isDeleted: { $ne: true }
		}).populate("userId", "name email phone companyName");

		return res.status(200).json({
			status: true,
			msg: "Pending immediate tag requests fetched successfully",
			data: pendingJobs
		});
	} catch (error) {
		console.error("Error in getPendingImmediateTags:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

superAdmin.approveImmediateTag = async (req, res) => {
	try {
		const { jobId } = req.params;
		const Job = require("../models/job.model");

		const job = await Job.findById(jobId);
		if (!job) {
			return res.status(404).json({ status: false, msg: "Job not found" });
		}

		job.immediateTagActive = true;
		job.immediateTagExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
		job.immediateTagRequest = "APPROVED";
		await job.save();

		return res.status(200).json({
			status: true,
			msg: "Immediate tag request approved successfully!",
			data: job
		});
	} catch (error) {
		console.error("Error in approveImmediateTag:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

superAdmin.rejectImmediateTag = async (req, res) => {
	try {
		const { jobId } = req.params;
		const Job = require("../models/job.model");

		const job = await Job.findById(jobId);
		if (!job) {
			return res.status(404).json({ status: false, msg: "Job not found" });
		}

		job.immediateTagActive = false;
		job.immediateTagRequest = "REJECTED";
		await job.save();

		return res.status(200).json({
			status: true,
			msg: "Immediate tag request rejected.",
			data: job
		});
	} catch (error) {
		console.error("Error in rejectImmediateTag:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

superAdmin.getCompleteAnalytics = async (req, res) => {
	try {
		const serviceModel = require("../models/service.model");
		const addonModel = require("../models/addon.model");
		const paymentModel = require("../models/payment.model");

		let { search = "", status = "all", serviceType = "all", page = 1, limit = 50 } = req.query;
		page = parseInt(page) || 1;
		limit = parseInt(limit) || 50;

		// 1. Fetch All Active & Non-deleted Jobs with populated recruiter (userId) and assignedHR
		const jobQuery = { isDeleted: { $ne: true } };
		if (status === "active") jobQuery.isActive = true;
		else if (status === "expired") jobQuery.isActive = false;

		if (serviceType && serviceType !== "all") {
			jobQuery.serviceType = serviceType;
		}

		if (search && search.trim().length > 0) {
			const searchRegex = new RegExp(search.trim(), "i");
			jobQuery.$or = [
				{ jobTittle: searchRegex },
				{ companyName: searchRegex },
				{ companyShortName: searchRegex },
				{ location: searchRegex },
				{ serviceType: searchRegex }
			];
		}

		const totalJobsCount = await jobModel.countDocuments(jobQuery);
		const jobsData = await jobModel.find(jobQuery)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.populate({ path: "userId", select: "name email phone userType companyName companyLogo" })
			.populate({ path: "assignedHR", select: "name email number phone profileImage" })
			.lean();

		// 2. Fetch Job Applications for these jobs
		const jobIds = jobsData.map((j) => j._id);

		// Fetch all applications across these jobs
		const allApplications = await JobApplication.find({ jobId: { $in: jobIds } })
			.populate({ path: "applicantId", select: "name email phone userType profileImage experience skills resume" })
			.sort({ createdAt: -1 })
			.lean();

		// Group applications by jobId
		const applicationsByJob = {};
		let totalAppliedCount = 0;
		let totalShortlistedCount = 0;
		let totalInterviewingCount = 0;
		let totalSelectedCount = 0;
		let totalRejectedCount = 0;
		let totalOfferedCount = 0;

		allApplications.forEach((app) => {
			const jId = app.jobId ? app.jobId.toString() : null;
			if (!jId) return;

			if (!applicationsByJob[jId]) {
				applicationsByJob[jId] = {
					total: 0,
					applied: 0,
					shortlisted: 0,
					interviewing: 0,
					selected: 0,
					rejected: 0,
					offered: 0,
					list: []
				};
			}

			const currentStage = String(app.status || app.stage || "applied").toLowerCase();
			applicationsByJob[jId].total += 1;
			applicationsByJob[jId].list.push(app);

			if (currentStage.includes("short")) {
				applicationsByJob[jId].shortlisted += 1;
				totalShortlistedCount += 1;
			} else if (currentStage.includes("interview")) {
				applicationsByJob[jId].interviewing += 1;
				totalInterviewingCount += 1;
			} else if (currentStage.includes("select")) {
				applicationsByJob[jId].selected += 1;
				totalSelectedCount += 1;
			} else if (currentStage.includes("reject")) {
				applicationsByJob[jId].rejected += 1;
				totalRejectedCount += 1;
			} else if (currentStage.includes("offer")) {
				applicationsByJob[jId].offered += 1;
				totalOfferedCount += 1;
			} else {
				applicationsByJob[jId].applied += 1;
				totalAppliedCount += 1;
			}
		});

		// 3. Fetch Service / Addon Orders & Build HR Assignment Lookup Map
		const serviceOrders = await serviceModel.find({})
			.populate({ path: "userId", select: "name email phone" })
			.populate({ path: "assignedHR", select: "name email number phone profileImage" })
			.lean();

		// Build HR Assignment Lookup Map from adminUserModel and serviceModel
		const hrJobMap = {};
		const allHRAdmins = await adminUserModel.find({ type: { $in: ["hr", "admin"] } }).lean();

		// A) Map from adminUser.jobTarget
		allHRAdmins.forEach((hr) => {
			if (Array.isArray(hr.jobTarget)) {
				hr.jobTarget.forEach((jt) => {
					if (Array.isArray(jt.jobIds)) {
						jt.jobIds.forEach((item) => {
							if (item && item.jobId) {
								const jId = item.jobId.toString();
								hrJobMap[jId] = {
									id: hr._id,
									name: hr.name,
									email: hr.email,
									number: hr.number || hr.phone || "",
									profileImage: hr.profileImage || ""
								};
							}
						});
					}
				});
			}
		});

		// B) Map from serviceModel orders
		serviceOrders.forEach((so) => {
			const jId = so.jobId || so.serviceData?.jobId;
			if (jId && so.assignedHR) {
				const jIdStr = jId.toString();
				if (!hrJobMap[jIdStr]) {
					hrJobMap[jIdStr] = {
						id: so.assignedHR._id || so.assignedHR,
						name: so.assignedHR.name || "HR Admin",
						email: so.assignedHR.email || "hr@hiringroof.com",
						number: so.assignedHR.number || so.assignedHR.phone || "",
						profileImage: so.assignedHR.profileImage || ""
					};
				}
			}
		});

		const defaultHRAdmin = allHRAdmins.find((h) => h.email === "hr@hiringroof.com") || allHRAdmins[0];

		// Calculate Revenue Breakdown
		let totalAddonRevenue = 0;
		const serviceTypeStats = {
			Urgent: { count: 0, revenue: 0 },
			Immediate: { count: 0, revenue: 0 },
			Premium: { count: 0, revenue: 0 },
			"Contact Deal": { count: 0, revenue: 0 }
		};

		serviceOrders.forEach((so) => {
			const amt = Number(so.totalAmount || so.serviceData?.amount || 0);
			if (amt > 0) {
				totalAddonRevenue += amt;
				const typeName = so.serviceData?.title || so.addonId?.name || so.serviceType || so.serviceData?.name || "";
				Object.keys(serviceTypeStats).forEach((key) => {
					if (typeName.toLowerCase().includes(key.toLowerCase())) {
						serviceTypeStats[key].count += 1;
						serviceTypeStats[key].revenue += amt;
					}
				});
			}
		});

		const priceMap = { Urgent: 102, Immediate: 204, "Contact Deal": 306, Premium: 510 };
		jobsData.forEach((j) => {
			const sType = j.serviceType || j.addOn?.name || j.addOn?.title;
			if (sType && sType !== "Standard" && priceMap[sType]) {
				const price = Number(j.addOn?.price ? Math.round(j.addOn.price * 1.02) : priceMap[sType]);
				const jIdStr = j._id.toString();
				const existsInService = serviceOrders.some((so) => (so.jobId?.toString() === jIdStr || so.serviceData?.jobId?.toString() === jIdStr));
				if (!existsInService) {
					totalAddonRevenue += price;
					Object.keys(serviceTypeStats).forEach((key) => {
						if (sType.toLowerCase().includes(key.toLowerCase())) {
							serviceTypeStats[key].count += 1;
							serviceTypeStats[key].revenue += price;
						}
					});
				}
			}
		});

		// 4. Fetch Users Count Summary (including companyRecruiter and individualRecruiter)
		const totalRecruitersCount = await User.countDocuments({
			userType: { $in: ["companyRecruiter", "individualRecruiter", "recruiter", "company"] }
		});
		const totalCandidatesCount = await User.countDocuments({ userType: { $in: ["jobSeeker", "user"] } });
		const totalHRsCount = await adminUserModel.countDocuments({ type: { $in: ["hr", "admin"] } });

		// 5. Build Formatted Jobs Payload
		const formattedJobs = jobsData.map((job) => {
			const jIdStr = job._id.toString();
			const appStats = applicationsByJob[jIdStr] || {
				total: 0,
				applied: 0,
				shortlisted: 0,
				interviewing: 0,
				selected: 0,
				rejected: 0,
				offered: 0,
				list: []
			};

			// Resolve assigned HR details
			const resolvedHR = job.assignedHR ? {
				id: job.assignedHR._id,
				name: job.assignedHR.name,
				email: job.assignedHR.email,
				number: job.assignedHR.number || job.assignedHR.phone || "",
				profileImage: job.assignedHR.profileImage || ""
			} : (hrJobMap[jIdStr] || (defaultHRAdmin ? {
				id: defaultHRAdmin._id,
				name: defaultHRAdmin.name,
				email: defaultHRAdmin.email,
				number: defaultHRAdmin.number || defaultHRAdmin.phone || "",
				profileImage: defaultHRAdmin.profileImage || ""
			} : null));

			return {
				jobId: job._id,
				jobTitle: job.jobTittle,
				companyName: job.companyName || job.companyShortName,
				companyShortName: job.companyShortName,
				companyLogo: job.companyLogo,
				location: job.location,
				jobType: job.jobType,
				workType: job.workType,
				pay: job.pay,
				payType: job.payType,
				vacancies: job.vacancies || 0,
				experience: job.experience,
				serviceType: job.serviceType || "Standard",
				isActive: job.isActive,
				isPaymentSuccess: job.isPaymentSuccess || false,
				expireDate: job.expireDate || null,
				createdAt: job.createdAt,

				// Recruiter Details
				recruiterDetails: job.userId ? {
					id: job.userId._id,
					name: job.userId.name,
					email: job.userId.email,
					phone: job.userId.phone,
					companyName: job.userId.companyName || job.companyName,
					companyLogo: job.userId.companyLogo || job.companyLogo,
					userType: job.userId.userType
				} : null,

				// Assigned HR Details
				assignedHRDetails: resolvedHR,

				// Candidates & Stages Analytics for this Job
				applicationsSummary: {
					totalCandidates: appStats.total,
					appliedCount: appStats.applied,
					shortlistedCount: appStats.shortlisted,
					interviewingCount: appStats.interviewing,
					selectedCount: appStats.selected,
					rejectedCount: appStats.rejected,
					offeredCount: appStats.offered
				},

				// Detailed Candidates List
				candidatesList: appStats.list.map((candidateApp) => ({
					applicationId: candidateApp._id,
					status: candidateApp.status || candidateApp.stage || "Applied",
					createdAt: candidateApp.createdAt,
					candidateDetails: candidateApp.applicantId ? {
						id: candidateApp.applicantId._id,
						name: candidateApp.applicantId.name,
						email: candidateApp.applicantId.email,
						phone: candidateApp.applicantId.phone,
						profileImage: candidateApp.applicantId.profileImage,
						skills: candidateApp.applicantId.skills || candidateApp.skills || [],
						experience: candidateApp.applicantId.experience || candidateApp.experience,
						resume: candidateApp.applicantId.resume || candidateApp.resume
					} : null,
					interviewDate: candidateApp.interviewDate || candidateApp.date || null,
					interviewTime: candidateApp.interviewTime || candidateApp.time || null,
					rejectionReason: candidateApp.rejectionReason || null
				}))
			};
		});

		return res.status(200).json({
			status: true,
			msg: "Complete Analytics Fetched Successfully",
			summary: {
				totalJobs: totalJobsCount,
				totalRecruiters: totalRecruitersCount,
				totalCandidates: totalCandidatesCount,
				totalHRs: totalHRsCount,
				totalApplications: allApplications.length,
				totalServiceOrders: serviceOrders.length,
				totalAddonRevenue: totalAddonRevenue,
				stagesBreakdown: {
					applied: totalAppliedCount,
					shortlisted: totalShortlistedCount,
					interviewing: totalInterviewingCount,
					selected: totalSelectedCount,
					rejected: totalRejectedCount,
					offered: totalOfferedCount
				},
				serviceTypeBreakdown: serviceTypeStats
			},
			pagination: {
				page,
				limit,
				totalJobs: totalJobsCount,
				totalPages: Math.ceil(totalJobsCount / limit)
			},
			jobs: formattedJobs
		});
	} catch (error) {
		console.error("Error in getCompleteAnalytics:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};
superAdmin.getCandidateAnalytics = async (req, res) => {
	try {
		const targetUserId = req.body?.userId || req.query?.userId || req.query?.candidateId || req.params?.userId;

		let candidateDetails = null;
		let query = {};

		if (targetUserId) {
			const candidateUser = await User.findById(targetUserId).select("-password").lean();
			if (!candidateUser) {
				return res.status(404).json({ status: false, msg: "Candidate not found for the provided ID" });
			}

			candidateDetails = {
				id: candidateUser._id,
				name: candidateUser.name,
				email: candidateUser.email,
				phone: candidateUser.phone,
				userType: candidateUser.userType,
				profileImage: candidateUser.profileImage || "",
				skills: candidateUser.skills || [],
				experience: candidateUser.experience || "",
				resume: candidateUser.resume || "",
				badge: candidateUser.badge || null,
				createdAt: candidateUser.createdAt
			};

			query.applicantId = targetUserId;
		}

		// Fetch all matching job applications
		const applications = await JobApplication.find(query)
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

		// 1. Applications Timeline (Bar Graph Data: Date & Time grouping)
		const timelineMap = {};
		applications.forEach((app) => {
			const createdDate = new Date(app.createdAt || Date.now());
			const dateKey = createdDate.toISOString().split("T")[0]; // YYYY-MM-DD
			const formattedDate = createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
			const monthKey = createdDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

			if (!timelineMap[dateKey]) {
				timelineMap[dateKey] = {
					date: dateKey,
					formattedDate: formattedDate,
					month: monthKey,
					count: 0,
					jobsApplied: []
				};
			}

			timelineMap[dateKey].count += 1;
			timelineMap[dateKey].jobsApplied.push({
				applicationId: app._id,
				jobId: app.jobId?._id,
				jobTitle: app.jobId?.jobTittle || "Untitled Position",
				companyName: app.jobId?.companyName || app.jobId?.companyShortName || "HiringRoof Client",
				appliedTime: createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
				status: app.pipelineStatus || app.status || "Applied"
			});
		});

		const barGraphData = Object.values(timelineMap).sort((a, b) => new Date(a.date) - new Date(b.date));

		// 2. Stages Breakdown & Percentage (Pie Chart Data)
		const stagesCount = {
			applied: 0,
			shortlisted: 0,
			interviewing: 0,
			selected: 0,
			rejected: 0,
			offered: 0
		};

		applications.forEach((app) => {
			const stageStr = String(app.pipelineStatus || app.status || app.stage || "applied").toLowerCase();
			if (stageStr.includes("short")) stagesCount.shortlisted += 1;
			else if (stageStr.includes("interview")) stagesCount.interviewing += 1;
			else if (stageStr.includes("select")) stagesCount.selected += 1;
			else if (stageStr.includes("reject")) stagesCount.rejected += 1;
			else if (stageStr.includes("offer")) stagesCount.offered += 1;
			else stagesCount.applied += 1;
		});

		const totalApps = applications.length;

		const pieChartData = [
			{
				stage: "Applied",
				count: stagesCount.applied,
				percentage: totalApps > 0 ? Number(((stagesCount.applied / totalApps) * 100).toFixed(2)) : 0,
				color: "#3b82f6"
			},
			{
				stage: "Shortlisted",
				count: stagesCount.shortlisted,
				percentage: totalApps > 0 ? Number(((stagesCount.shortlisted / totalApps) * 100).toFixed(2)) : 0,
				color: "#8b5cf6"
			},
			{
				stage: "Interviewing",
				count: stagesCount.interviewing,
				percentage: totalApps > 0 ? Number(((stagesCount.interviewing / totalApps) * 100).toFixed(2)) : 0,
				color: "#f97316"
			},
			{
				stage: "Selected",
				count: stagesCount.selected,
				percentage: totalApps > 0 ? Number(((stagesCount.selected / totalApps) * 100).toFixed(2)) : 0,
				color: "#22c55e"
			},
			{
				stage: "Rejected",
				count: stagesCount.rejected,
				percentage: totalApps > 0 ? Number(((stagesCount.rejected / totalApps) * 100).toFixed(2)) : 0,
				color: "#ef4444"
			},
			{
				stage: "Offered",
				count: stagesCount.offered,
				percentage: totalApps > 0 ? Number(((stagesCount.offered / totalApps) * 100).toFixed(2)) : 0,
				color: "#10b981"
			}
		];

		// 3. Detailed Applied Jobs List
		const applicationHistory = applications.map((app) => {
			const createdDate = new Date(app.createdAt || Date.now());
			return {
				applicationId: app._id,
				jobId: app.jobId?._id,
				jobTitle: app.jobId?.jobTittle || "Untitled Position",
				companyName: app.jobId?.companyName || app.jobId?.companyShortName || "HiringRoof Client",
				companyLogo: app.jobId?.companyLogo || "",
				location: app.jobId?.location || "Remote",
				serviceType: app.jobId?.serviceType || "Standard",
				appliedDate: createdDate.toISOString().split("T")[0],
				appliedTime: createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
				appliedDateTimeFormatted: createdDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
				stage: app.pipelineStatus || app.status || "Applied",
				interviewDate: app.interviewsDate || null,
				interviewTime: app.interviewsTime || null,
				candidateDetails: app.applicantId ? {
					id: app.applicantId._id,
					name: app.applicantId.name,
					email: app.applicantId.email,
					phone: app.applicantId.phone,
					profileImage: app.applicantId.profileImage
				} : null,
				recruiterDetails: app.jobId?.userId ? {
					id: app.jobId.userId._id,
					name: app.jobId.userId.name,
					email: app.jobId.userId.email,
					phone: app.jobId.userId.phone,
					companyName: app.jobId.userId.companyName
				} : null,
				assignedHRDetails: app.jobId?.assignedHR ? {
					id: app.jobId.assignedHR._id,
					name: app.jobId.assignedHR.name,
					email: app.jobId.assignedHR.email,
					number: app.jobId.assignedHR.number || app.jobId.assignedHR.phone
				} : null
			};
		});

		return res.status(200).json({
			status: true,
			msg: "Candidate Analytics Fetched Successfully",
			candidateDetails,
			summary: {
				totalJobsApplied: totalApps,
				appliedCount: stagesCount.applied,
				shortlistedCount: stagesCount.shortlisted,
				interviewingCount: stagesCount.interviewing,
				selectedCount: stagesCount.selected,
				rejectedCount: stagesCount.rejected,
				offeredCount: stagesCount.offered,
				selectionRatePercentage: totalApps > 0 ? Number(((stagesCount.selected / totalApps) * 100).toFixed(2)) : 0,
				shortlistRatePercentage: totalApps > 0 ? Number(((stagesCount.shortlisted / totalApps) * 100).toFixed(2)) : 0
			},
			barGraphData,
			pieChartData,
			applicationHistory
		});
	} catch (error) {
		console.error("Error in getCandidateAnalytics:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// ---------------------------------------------------
// GET USER INTRO VIDEOS (FOR SWIPER / SLIDER & SEARCH)
// ---------------------------------------------------
superAdmin.getUserIntroVideos = async (req, res) => {
	try {
		const { search = "", userType = "all", page = 1, limit = 50 } = req.query;

		// Base query: videoUrl must exist and be non-empty
		const query = {
			videoUrl: { $exists: true, $ne: "", $regex: /\S/ }
		};

		// Filter by userType if specified and not 'all'
		if (userType && userType !== "all") {
			if (userType === "jobSeeker") {
				query.userType = "jobSeeker";
			} else if (userType === "recruiter") {
				query.userType = { $in: ["individualRecruiter", "companyRecruiter", "recruiter", "company"] };
			} else {
				query.userType = userType;
			}
		}

		// Filter by search string across name, email, phone, profession, skills, location, about, companyName
		if (search && search.trim() !== "") {
			const searchRegex = new RegExp(search.trim(), "i");
			query.$or = [
				{ name: searchRegex },
				{ email: searchRegex },
				{ phone: searchRegex },
				{ profession: searchRegex },
				{ location: searchRegex },
				{ about: searchRegex },
				{ skills: searchRegex },
				{ companyName: searchRegex }
			];
		}

		const skip = (Number(page) - 1) * Number(limit);
		const total = await userModel.countDocuments(query);
		const users = await userModel
			.find(query)
			.select("name email phone profileImage userType profession videoUrl skills experience location about companyName createdAt selectedBadge isHired")
			.sort("-createdAt")
			.skip(skip)
			.limit(Number(limit))
			.lean();

		return res.status(200).json({
			status: true,
			msg: "User Intro Videos fetched successfully",
			total,
			page: Number(page),
			pages: Math.ceil(total / Number(limit)) || 1,
			data: users
		});
	} catch (error) {
		console.error("Error in getUserIntroVideos:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = superAdmin;
