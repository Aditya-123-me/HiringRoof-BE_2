
const User = require("../models/user.model");
	 
const jwt = require("jsonwebtoken");
const extractSkillSub = require("../util/functions");
const { JWT_SECRET } = require("../config/config");
const createNotification = require("../util/createNotification");
const JobApplication = require("../models/jobApplication.model");
const mongoose = require("mongoose");
const { deleteFromFirebase, imageUpload } = require("../util/googleDrive.util");
const { getVideoDurationInSeconds } = require("get-video-duration");
const fs = require("fs");
const jobModel = require("../models/job.model");
const adminUserModel = require("../models/adminUser.model");
const convertTo12HourFormat = require("../util/convertTo12HourFormat");
const BadgeRemoveRequestModel = require("../models/BadgeRemoveRequest.model");
const userModel = require("../models/user.model");

const userController = {};

userController.addRescheduleRequest = async (req, res) => {
	try {
		const targetId = req.body._id || req.body.applicationId;
		const { newDate, newTime, reason, interviewType, requestedBy } = req.body;

		if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
			return res.status(400).json({ status: false, msg: "Invalid Job Application ID" });
		}

		const jobApplication = await JobApplication.findById(targetId);
		if (!jobApplication) {
			return res.status(404).json({ status: false, msg: "Job Application not found" });
		}

		jobApplication.temp = {
			newDate,
			newTime: convertTo12HourFormat(newTime),
			reason,
			requestedBy,
			interviewType,
		};

		await jobApplication.save();

		return res.status(200).send({
			status: true,
			msg: " Interview reschedule request added successfully !!",
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

userController.login = async (req, res) => {
	try {
		let { phone, userType } = req.body;
		if (!phone) return res.status(404).send({ status: false, msg: "Please provide a number !!" });

		const { normalizePhone } = require("../util/normalizeCandidateData");
		phone = normalizePhone(phone);

		if (phone.length < 10)
			return res.status(404).send({ status: false, msg: "Please provide a valid 10-digit number !!" });

		const findNumber = await User.findOne({ phone });

		const min = 100000;
		const max = 999999;
		const otp = Math.floor(Math.random() * (max - min + 1)) + min;

		const isRecruiterRole = (r) => ["companyRecruiter", "individualRecruiter", "company", "recruiter"].includes(r);
		const isCandidateRole = (r) => r === "jobSeeker";
		const isRegisteredAccount = (u) => {
			if (!u) return false;
			const hasName = u.name && String(u.name).trim() !== "";
			const hasEmail = u.email && String(u.email).trim() !== "";
			const hasScore = u.profileComplete && Number(u.profileComplete) > 10;
			return Boolean(hasName || hasEmail || hasScore);
		};

		if (findNumber) {
			// Validate role mismatch ONLY if the account is fully registered with a profile
			if (isRegisteredAccount(findNumber) && userType && userType.trim() && findNumber.userType && findNumber.userType.trim()) {
				const reqRole = userType.trim();
				const dbRole = findNumber.userType.trim();

				const isReqRec = isRecruiterRole(reqRole);
				const isReqCand = isCandidateRole(reqRole);
				const isDbRec = isRecruiterRole(dbRole);
				const isDbCand = isCandidateRole(dbRole);

				if ((isReqCand && isDbRec) || (isReqRec && isDbCand)) {
					return res.status(400).send({
						status: false,
						msg: `This phone number is registered as a ${isDbRec ? "Recruiter" : "Candidate"}. Please log in using the correct portal.`,
					});
				}
			}

			if (findNumber.blocked_status)
				return res.status(404).send({
					status: false,
					msg: "This account is disabled, please contact the administrator.",
					otp: 0,
					firstTime: false,
				});

			await User.findByIdAndUpdate(findNumber._id, { otp }, { new: true });

			return res.status(200).send({ status: true, otp, firstTime: false, msg: "Otp send successfully !!" });
		} else {
			// For new registrations, set userType if provided
			let finalUserType = userType && userType.trim() ? userType.trim() : "jobSeeker";
			if (finalUserType === "company") finalUserType = "companyRecruiter";
			if (finalUserType === "recruiter") finalUserType = "individualRecruiter";

			await User.create({ phone, otp, userType: finalUserType });
			return res.status(200).send({ status: true, otp, firstTime: true, msg: "Otp send successfully !!" });
		}
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.verify = async (req, res, io) => {
	try {
		let { phone, otp, userType } = req.body;
		if (!phone || !otp) return res.status(404).send({ status: false, msg: "Please provide number & otp !!" });

		const { normalizePhone } = require("../util/normalizeCandidateData");
		phone = normalizePhone(phone);

		const findNumber = await User.findOne({ phone, otp });
		if (!findNumber) return res.status(401).send({ status: false, msg: "Phone or OTP is wrong, Please try again !!" });

		const isRecruiterRole = (r) => ["companyRecruiter", "individualRecruiter", "company", "recruiter"].includes(r);
		const isCandidateRole = (r) => r === "jobSeeker";
		const isRegisteredAccount = (u) => {
			if (!u) return false;
			const hasName = u.name && String(u.name).trim() !== "";
			const hasEmail = u.email && String(u.email).trim() !== "";
			const hasScore = u.profileComplete && Number(u.profileComplete) > 10;
			return Boolean(hasName || hasEmail || hasScore);
		};

		// Validate role mismatch on OTP verification ONLY for registered accounts
		if (isRegisteredAccount(findNumber) && userType && userType.trim() && findNumber.userType && findNumber.userType.trim()) {
			const reqRole = userType.trim();
			const dbRole = findNumber.userType.trim();

			const isReqRec = isRecruiterRole(reqRole);
			const isReqCand = isCandidateRole(reqRole);
			const isDbRec = isRecruiterRole(dbRole);
			const isDbCand = isCandidateRole(dbRole);

			if ((isReqCand && isDbRec) || (isReqRec && isDbCand)) {
				return res.status(400).send({
					status: false,
					msg: `Role Mismatch: Account is registered as ${isDbRec ? "Recruiter" : "Candidate"}. Please use the correct portal.`,
				});
			}
		}

		let update;
		const { calculateProfileComplete } = require("../util/normalizeCandidateData");
		const currentScore = calculateProfileComplete(findNumber);
		
		// Normalize incoming userType if provided
		let requestedUserType = userType && userType.trim() ? userType.trim() : "";
		if (requestedUserType === "company") requestedUserType = "companyRecruiter";
		if (requestedUserType === "recruiter") requestedUserType = "individualRecruiter";

		// Set/update userType if provided and account is not fully registered yet
		if (requestedUserType && (!isRegisteredAccount(findNumber) || !findNumber.userType)) {
			update = await User.findByIdAndUpdate(
				findNumber._id,
				{ $set: { otp: "", userType: requestedUserType, profileComplete: Math.max(10, currentScore) } },
				{ new: true }
			);
		} else {
			update = await User.findByIdAndUpdate(findNumber._id, { $set: { otp: "" } }, { new: true });
		}

		const token = jwt.sign({ _id: update._id }, JWT_SECRET, {
			expiresIn: "60d",
		});
		if (userType && userType.trim()) {
			const data = await createNotification({
				senderId: update._id,
				receiverId: update._id,
				title: `Welcome ${update.name}`,
				desc: `Welcome !!`,
				logo: "",
			});
			io.emit(`notifications_${data.receiverId._id}`, data);
		} else {
			const data = await createNotification({
				senderId: update._id,
				receiverId: update._id,
				title: `Welcome ${update.name}`,
				desc: `Welcome Back !!`,
				logo: "",
			});
			io.emit(`notifications_${data.receiverId._id}`, data);
		}

		return res.status(200).send({
			status: true,
			userId: update._id,
			phone: update.phone,
			userType: update.userType,
			userData: update,
			token,
			msg: "Login successfully !!",
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.delete = async (req, res) => {
	try {
		const { _id } = req.params;

		const userRecord = await User.findOne({ _id });
		if (!userRecord)
			return res.status(404).send({
				status: true,
				msg: "Invalid User !!",
			});

		await User.deleteOne({ _id });

		return res.status(200).send({
			status: true,
			msg: "User deleted successfully !!",
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.user = async (req, res) => {
	try {
		const { _id, phone } = req.query;

		let userRecord;

		if (_id) userRecord = await User.findOne({ _id });
		if (phone) userRecord = await User.findOne({ phone });

		if (!userRecord)
			return res.status(404).send({
				status: true,
				msg: "User does't exits !!",
			});

		let formattedRecord = userRecord.toObject ? userRecord.toObject() : userRecord;
		if (req.user && req.user.type === "hr" && formattedRecord.userType === "jobSeeker") {
			const isUploadedByThisHR = formattedRecord.uploadedBy && formattedRecord.uploadedBy.toString() === req.user._id.toString();
			if (!isUploadedByThisHR) {
				formattedRecord = {
					...formattedRecord,
					phone: "Hidden (Self-Enrolled)",
					alternativePhone: "Hidden (Self-Enrolled)",
					alternativePhone2: "Hidden (Self-Enrolled)",
					email: "Hidden (Self-Enrolled)",
					address: "Hidden (Self-Enrolled)",
					resume: "",
					resumeFileName: "",
					withoutContactResume: "",
					letter: "",
					letterFileName: "",
					currentPay: "Hidden",
					expectationPay: "Hidden",
					dob: "Hidden",
					gender: "Hidden"
				};
			}
		}

		let extraData = null;
		// Add extra detailed analytics for Super Admin (req.user.type === "admin", "superAdmin", "superadmin", or "sub-admin")
		if (req.user && ["admin", "superAdmin", "superadmin", "sub-admin"].includes(req.user.type)) {
			if (formattedRecord.userType === "jobSeeker") {
				const JobApplication = require("../models/jobApplication.model");
				// Fetch all job applications for this candidate
				const applications = await JobApplication.find({ applicantId: formattedRecord._id })
					.populate("jobId")
					.lean();
				
				const appliedJobsHistory = applications.map(app => ({
					jobId: app.jobId?._id,
					jobTitle: app.jobId?.jobTittle,
					companyName: app.jobId?.companyName,
					pipelineStatus: app.pipelineStatus || "Applied",
					appliedDate: app.createdAt,
					interviewStatus: app.interviewStatus,
					interviewsDate: app.interviewsDate,
					interviewsTime: app.interviewsTime,
					interviews2Date: app.interviews2Date,
					interviews2Time: app.interviews2Time,
					offerLetterDate: app.offerLetterDate,
					offerLetterTime: app.offerLetterTime
				}));

				// Calculate candidate-level application summary stats
				const totalApplied = applications.length;
				const totalShortlisted = applications.filter(app => app.shortlist).length;
				const totalSelected = applications.filter(app => app.pipelineStatus === "Selected").length;
				const totalRejected = applications.filter(app => app.pipelineStatus === "Rejected").length;

				// Fetch purchased addons/services
				const Service = require("../models/service.model");
				const purchasedServices = await Service.find({
					userId: formattedRecord._id,
					paymentStatus: "APPROVED"
				}).populate("addonId").lean();

				const totalSpent = purchasedServices.reduce((sum, s) => sum + s.totalAmount, 0);
				const purchaseHistory = purchasedServices.map(s => ({
					serviceId: s._id,
					addonId: s.addonId?._id,
					title: s.addonId?.title || s.serviceData?.title || "Addon Service",
					amount: s.totalAmount,
					purchaseDate: s.date,
					expireDate: s.expireDate,
					isActive: s.isActive,
					rating: s.rating,
					reviewText: s.reviewText
				}));

				extraData = {
					appliedJobsHistory,
					analytics: {
						totalApplied,
						totalShortlisted,
						totalSelected,
						totalRejected
					},
					purchasedAddons: {
						totalSpent,
						totalPurchasedCount: purchasedServices.length,
						purchaseHistory
					}
				};
			} else if (["individualRecruiter", "companyRecruiter", "recruiter", "company"].includes(formattedRecord.userType)) {
				const Job = require("../models/job.model");
				const JobApplication = require("../models/jobApplication.model");

				// Fetch all jobs posted by this recruiter
				const jobs = await Job.find({ userId: formattedRecord._id }).lean();

				const jobsData = [];
				let grandTotalApplicants = 0;
				let grandTotalSelected = 0;
				let grandTotalRejected = 0;

				for (const job of jobs) {
					// Count applicants for this job
					const applicantsCount = await JobApplication.countDocuments({ jobId: job._id });
					grandTotalApplicants += applicantsCount;

					// Aggregate status counts for this job
					const statusAggregation = await JobApplication.aggregate([
						{ $match: { jobId: job._id } },
						{ $group: { _id: "$pipelineStatus", count: { $sum: 1 } } }
					]);

					const statusBreakdown = {
						Applied: 0,
						Shortlisted: 0,
						"Interview 1": 0,
						"Interview 2": 0,
						Selected: 0,
						Rejected: 0
					};

					statusAggregation.forEach(group => {
						const statusName = group._id || "Applied";
						if (statusBreakdown[statusName] !== undefined) {
							statusBreakdown[statusName] = group.count;
						}
					});

					grandTotalSelected += statusBreakdown.Selected;
					grandTotalRejected += statusBreakdown.Rejected;

					jobsData.push({
						jobId: job._id,
						jobTitle: job.jobTittle,
						companyName: job.companyName,
						location: job.location,
						isActive: job.isActive,
						createdAt: job.createdAt,
						applicantsCount,
						statusBreakdown
					});
				}

				// Fetch purchased addons/services for recruiter
				const Service = require("../models/service.model");
				const purchasedServices = await Service.find({
					userId: formattedRecord._id,
					paymentStatus: "APPROVED"
				}).populate("addonId").lean();

				const totalSpent = purchasedServices.reduce((sum, s) => sum + s.totalAmount, 0);
				const purchaseHistory = purchasedServices.map(s => ({
					serviceId: s._id,
					addonId: s.addonId?._id,
					title: s.addonId?.title || s.serviceData?.title || "Addon Service",
					amount: s.totalAmount,
					purchaseDate: s.date,
					expireDate: s.expireDate,
					isActive: s.isActive,
					rating: s.rating,
					reviewText: s.reviewText
				}));

				extraData = {
					postedJobs: jobsData,
					analytics: {
						totalJobsPosted: jobs.length,
						totalApplicantsCount: grandTotalApplicants,
						totalSelectedCount: grandTotalSelected,
						totalRejectedCount: grandTotalRejected
					},
					purchasedAddons: {
						totalSpent,
						totalPurchasedCount: purchasedServices.length,
						purchaseHistory
					}
				};
			}
		}

		return res.status(200).send({
			status: true,
			userRecord: formattedRecord,
			extraData,
			msg: "User fetch successfully !!",
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.users = async (req, res) => {
	try {
		res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
		res.setHeader("Pragma", "no-cache");
		res.setHeader("Expires", "0");

		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 25;

		const options = {
			limit: parseInt(limit),
			skip: (page - 1) * limit,
			sort: { createdAt: -1 },
		};

		const filter = {};
		if (req.query.type) filter.userType = req.query.type;

		if (req.user && req.user.type === "hr") {
			const assignedJobIds = req.user?.jobTarget?.reduce((acc, target) => {
				if (target.jobIds) {
					target.jobIds?.forEach((j) => {
						if (j.jobId) acc.push(j.jobId);
					});
				}
				return acc;
			}, []) || [];

			if (req.query.type === "companyRecruiter" || req.query.type === "individualRecruiter") {
				const Job = require("../models/job.model");
				const jobs = await Job.find({ _id: { $in: assignedJobIds } }).select("userId");
				const recruiterIdsFromJobs = jobs.map((job) => job.userId).filter(Boolean);

				filter.userType = req.query.type;
				filter._id = { $in: recruiterIdsFromJobs };
			} else {
				const JobApplication = require("../models/jobApplication.model");
				const jobApps = await JobApplication.find({ jobId: { $in: assignedJobIds } }).select("applicantId");
				const candidateIdsFromJobs = jobApps.map((app) => app.applicantId).filter(Boolean);

				filter.userType = "jobSeeker";
				filter.$or = [
					{ uploadedBy: req.user._id },
					{ _id: { $in: candidateIdsFromJobs } }
				];
			}
		}

		let users = await User.find(filter, null, options).lean();
		const totalUser = await User.countDocuments(filter);

		if (req.user && req.user.type === "hr") {
			users = users.map(user => {
				if (user.userType === "jobSeeker") {
					const isUploadedByThisHR = user.uploadedBy && user.uploadedBy.toString() === req.user._id.toString();
					if (!isUploadedByThisHR) {
						return {
							...user,
							phone: "Hidden (Self-Enrolled)",
							alternativePhone: "Hidden (Self-Enrolled)",
							alternativePhone2: "Hidden (Self-Enrolled)",
							email: "Hidden (Self-Enrolled)",
							address: "Hidden (Self-Enrolled)",
							resume: "",
							resumeFileName: "",
							withoutContactResume: "",
							letter: "",
							letterFileName: "",
							currentPay: "Hidden",
							expectationPay: "Hidden",
							dob: "Hidden",
							gender: "Hidden"
						};
					}
				}
				return user;
			});
		}

		return res.status(200).json({
			status: true,
			msg: "Data fetched successfully !!",
			totalUser,
			totalPage: parseInt(Math.ceil(totalUser / limit)),
			currentPage: parseInt(page),
			users,
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.jobSeeker = async (req, res) => {
	try {
		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 25;

		const options = {
			limit: parseInt(limit),
			skip: (page - 1) * limit,
			sort: { createdAt: -1 },
		};

		const filters = { userType: "jobSeeker" };
		if (req.user && req.user.type === "hr") {
			const JobApplication = require("../models/jobApplication.model");
			const assignedJobIds = req.user?.jobTarget?.reduce((acc, target) => {
				if (target.jobIds) {
					target.jobIds?.forEach((j) => {
						if (j.jobId) acc.push(j.jobId);
					});
				}
				return acc;
			}, []) || [];

			const jobApps = await JobApplication.find({ jobId: { $in: assignedJobIds } }).select("applicantId");
			const candidateIdsFromJobs = jobApps.map((app) => app.applicantId);

			filters.$or = [
				{ uploadedBy: req.user._id },
				{ _id: { $in: candidateIdsFromJobs } }
			];
		} else if (req.user && req.user.type !== "superAdmin" && req.user.type !== "superadmin" && req.user.type !== "admin" && req.user.type !== "sub-admin") {
			const JobApplication = require("../models/jobApplication.model");
			const assignedJobs = req.user?.jobTarget?.reduce((acc, target) => {
				if (target.jobIds) {
					target.jobIds?.forEach((j) => {
						if (j.jobId) acc.push(j.jobId);
					});
				}
				return acc;
			}, []) || [];
			const jobApps = await JobApplication.find({ jobId: { $in: assignedJobs } }).select("applicantId");
			const candidateIds = jobApps.map((app) => app.applicantId);
			filters._id = { $in: candidateIds };
		}


		let users = await User.find(filters, null, options).lean();
		const totalUser = await User.countDocuments(filters);

		if (req.user && req.user.type === "hr") {
			users = users.map(user => {
				const isUploadedByThisHR = user.uploadedBy && user.uploadedBy.toString() === req.user._id.toString();
				if (!isUploadedByThisHR) {
					return {
						...user,
						phone: "Hidden (Self-Enrolled)",
						alternativePhone: "Hidden (Self-Enrolled)",
						alternativePhone2: "Hidden (Self-Enrolled)",
						email: "Hidden (Self-Enrolled)",
						address: "Hidden (Self-Enrolled)",
						resume: "",
						resumeFileName: "",
						withoutContactResume: "",
						letter: "",
						letterFileName: "",
						currentPay: "Hidden",
						expectationPay: "Hidden",
						dob: "Hidden",
						gender: "Hidden"
					};
				}
				return user;
			});
		}

		return res.status(200).json({
			status: true,
			msg: "Data fetched successfully !!",
			totalUser,
			totalPage: parseInt(Math.ceil(totalUser / limit)),
			currentPage: parseInt(page),
			data: users,
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.company = async (req, res) => {
	try {
		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 25;

		const options = {
			limit: parseInt(limit),
			skip: (page - 1) * limit,
			sort: { createdAt: -1 },
		};

		const users = await User.find({ userType: { $ne: "jobSeeker" } }, null, options);
		const totalUser = await User.countDocuments({ userType: { $ne: "jobSeeker" } });

		return res.status(200).json({
			status: true,
			msg: "Data fetched successfully !!",
			totalUser,
			totalPage: parseInt(Math.ceil(totalUser / limit)),
			currentPage: parseInt(page),
			data: users,
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.update = async (req, res, io) => {
	try {
		const { _id } = req.params;
		let bodyData = {};

		if (req.body.phone) bodyData.phone = req.body.phone;
		if (req.body.name) bodyData.name = req.body.name;
		if (req.body.email) bodyData.email = req.body.email;
		if (req.body.location) bodyData.location = req.body.location;
		if (req.body.currentPay) bodyData.currentPay = req.body.currentPay;
		if (req.body.expectationPay) bodyData.expectationPay = req.body.expectationPay;
		if (req.body.experience) bodyData.experience = req.body.experience;
		if (req.body.alternativePhone) bodyData.alternativePhone = req.body.alternativePhone;
		if (req.body.alternativePhone2) bodyData.alternativePhone2 = req.body.alternativePhone2;
		if (req.body.address) bodyData.address = req.body.address;
		if (req.body.gender) bodyData.gender = req.body.gender;
		if (req.body.dob) bodyData.dob = req.body.dob;
		if (req.body.about) bodyData.about = req.body.about;
		if (req.body.profession) bodyData.profession = req.body.profession;
		if (req.body.companyName) bodyData.companyName = req.body.companyName;
		if (req.body.aboutCompany) bodyData.aboutCompany = req.body.aboutCompany;
		if (req.body.companyType) bodyData.companyType = req.body.companyType;
		if (req.body.companyEmail) bodyData.companyEmail = req.body.companyEmail;
		if (req.body.companyPhone) bodyData.companyPhone = req.body.companyPhone;
		if (req.body.companyAlternativePhone) bodyData.companyAlternativePhone = req.body.companyAlternativePhone;
		if (req.body.response) bodyData.response = req.body.response;
		if (req.body.status) bodyData.status = req.body.status;
		if (req.body.jobStatus) bodyData.status = req.body.jobStatus; // alias
		if (req.body.wfo) bodyData.wfo = req.body.wfo;
		if (req.body.interested) bodyData.interested = req.body.interested;
		if (req.body.callBy) bodyData.callBy = req.body.callBy;
		if (req.body.feedback) bodyData.feedback = req.body.feedback;
		if (req.body.skills) {
			if (typeof req.body.skills === "string") {
				try {
					bodyData.skills = JSON.parse(req.body.skills);
				} catch (e) {
					bodyData.skills = req.body.skills.split(",").map((s) => s.trim()).filter(Boolean);
				}
			} else if (Array.isArray(req.body.skills)) {
				bodyData.skills = req.body.skills;
			}
		}

		if (req.body.skillDetails) {
			try {
				const extractData = extractSkillSub(typeof req.body.skillDetails === "string" ? JSON.parse(req.body.skillDetails) : req.body.skillDetails);
				bodyData.skillDetails = extractData.mergedSkillDetails;
				bodyData.skillSubCategories = extractData.skillSubCategories;
				if (!bodyData.skills) bodyData.skills = extractData.skills;
			} catch (e) {
				console.log("Skill details parsing skipped");
			}
		}

		const user = await User.findOne({ _id });
		if (!user) return res.status(404).json({ status: false, msg: "User doesn't exits !!" });

		const phoneNumber = await User.findOne({ phone: bodyData.phone });
		if (phoneNumber && phoneNumber._id.toString() !== _id)
			return res
				.status(401)
				.json({ status: false, msg: "Can't add this phone number, It's already link to another account !!" });

		if (req.files && req.files["profileImage"]) {
			const profileImage = req.files["profileImage"][0];
			if (profileImage) {
				const profileImageUrl = await imageUpload(profileImage, `${req.user._id}_userImage`, "userImage");
				if (!profileImageUrl)
					return res.status(404).json({ status: false, msg: `Image upload failed, please try again !!` });
				else bodyData.profileImage = profileImageUrl;
			}
		}

		if (req.files && req.files["resume"]) {
			const resume = req.files["resume"][0];
			if (resume) {
				const resumeUrl = await imageUpload(resume, `${req.user._id}_resume`, "resume");
				if (!resumeUrl) return res.status(404).json({ status: false, msg: `Resume upload failed, please try again !!` });
				else {
					bodyData.resume = resumeUrl;
					bodyData.resumeFileName = resume.originalname;
					bodyData.resumeSize = (resume.size / (1024 * 1024)).toFixed(2) + " MB";
					
					try {
						const pdfParse = require("pdf-parse");
						const parsed = await pdfParse(resume.buffer);
						bodyData.resumePages = parsed.numpages;
					} catch (e) {
						bodyData.resumePages = 0;
					}
				}
			}
		}

		if (req.files && req.files["videoUrl"]) {
			const video = req.files["videoUrl"][0];
			if (video.size / 1024 / 1024 > 200)
				return res.status(400).json({ status: false, msg: `Please upload a video under 200MB !!`, user: {} });

			try {
				let videoUrl = "";

				// Try uploading to cloud storage (Google Drive / Firebase)
				try {
					videoUrl = await imageUpload(video, `${req.user._id}_video`, "userVideo");
				} catch (gErr) {
					console.error("Cloud storage video upload error, using local fallback:", gErr);
				}

				// Fallback to local static storage if cloud upload returned empty or failed
				if (!videoUrl) {
					const destinationDirectory = path.join(__dirname, "../../uploads/userVideo/");
					if (!fs.existsSync(destinationDirectory)) fs.mkdirSync(destinationDirectory, { recursive: true });
					const ext = (video.originalname || "video.mp4").split(".").pop() || "mp4";
					const fileName = `${req.user._id}_video_${Date.now()}.${ext}`;
					const filePath = path.join(destinationDirectory, fileName);
					fs.writeFileSync(filePath, video.buffer);
					videoUrl = `uploads/userVideo/${fileName}`;
				}

				bodyData.videoUrl = videoUrl;
			} catch (vErr) {
				console.error("Video processing error:", vErr);
				return res.status(500).json({ status: false, msg: "Video processing error: " + vErr.message });
			}
		}

		if (req.files && req.files["letter"]) {
			const letter = req.files["letter"][0];
			if (letter) {
				const letterUrl = await imageUpload(letter, `${req.user._id}_letter`, "userLetter");
				if (!letterUrl) return res.status(404).json({ status: false, msg: `Letter upload failed, please try again !!` });
				else {
					bodyData.letter = letterUrl;
					bodyData.letterFileName = letter.originalname;
					bodyData.letterSize = (letter.size / (1024 * 1024)).toFixed(2) + " MB";

					try {
						const pdfParse = require("pdf-parse");
						const parsed = await pdfParse(letter.buffer);
						bodyData.letterPages = parsed.numpages;
					} catch (e) {
						bodyData.letterPages = 0;
					}
				}
			}
		}

		if (req.files && req.files["companyLogo"]) {
			const companyLogo = req.files["companyLogo"][0];
			if (companyLogo) {
				const companyLogoUrl = await imageUpload(companyLogo, `${req.user._id}_companyLogo`, "userCompanyLogo");
				if (!companyLogoUrl)
					return res.status(404).json({ status: false, msg: `Company Logo upload failed, please try again !!` });
				else bodyData.companyLogo = companyLogoUrl;
			}
		}

		const updatedUser = await User.findByIdAndUpdate({ _id }, { $set: bodyData }, { new: true });

		// notification
		if (req.body.skillDetails || req.body.skills) {
			const skillSubCats = (updatedUser.skillSubCategories || []).map((tag) => new RegExp(tag, "i"));
			const userSkills = (updatedUser.skills || []).map((tag) => new RegExp(tag, "i"));

			const jobs = await jobModel
				.find({
					$or: [{ skillSubCategories: { $in: skillSubCats } }, { skills: { $in: userSkills } }],
					isActive: true,
					blocked_status: false,
				})
				.select("userId skills skillSubCategories companyLogo jobTittle");

			await Promise.all(
				jobs.map(async (job) => {
					const data = await createNotification({
						senderId: updatedUser._id,
						receiverId: job.userId,
						title: `Candidate suggestion according to ${job.jobTittle} job skills`,
						desc: `${updatedUser?.name} have knowledge in ${updatedUser.skills.join(", ")} skills`,
						logo: job.companyLogo,
						keyName: "users",
						extraData: [updatedUser],
					});
					io.emit(`notifications_${data.receiverId._id}`, data);
				})
			);
		}

		if (req.files && req.files["videoUrl"]) {
			const data = await createNotification({
				senderId: updatedUser._id,
				receiverId: updatedUser._id,
				title: `${updatedUser.name} congratulation !!`,
				desc: `${updatedUser.name} you update your intro video !!`,
				logo: updatedUser.profileImage,
			});
			io.emit(`notifications_${data.receiverId._id}`, data);
		}

		// NOTE: Profile Complete Calculation
		const { calculateProfileComplete } = require("../util/normalizeCandidateData");
		updatedUser.profileComplete = calculateProfileComplete(updatedUser);
		await updatedUser.save();

		return res.status(200).json({ status: true, user: updatedUser, msg: "User updated successfully !!" });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.projects = async (req, res) => {
	try {
		const { _id } = req.params;
		const bodyData = req.body;

		const user = await User.findOne({ _id });
		if (!user) return res.status(404).json({ status: false, msg: "User doesn't exits !!" });

		const { calculateProfileComplete } = require("../util/normalizeCandidateData");
		const updatedUser = await User.findByIdAndUpdate({ _id }, { $set: { projects: bodyData } }, { new: true });
		updatedUser.profileComplete = calculateProfileComplete(updatedUser);
		await updatedUser.save();

		return res.status(200).json({ status: true, user: updatedUser, msg: "User updated successfully !!" });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.education = async (req, res) => {
	try {
		const { _id } = req.params;
		const bodyData = req.body;

		const { calculateProfileComplete } = require("../util/normalizeCandidateData");
		const updatedUser = await User.findByIdAndUpdate({ _id }, { $set: { education: bodyData } }, { new: true });
		updatedUser.profileComplete = calculateProfileComplete(updatedUser);
		await updatedUser.save();

		return res.status(200).json({ status: true, user: updatedUser, msg: "User updated successfully !!" });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.numberCheck = async (req, res) => {
	try {
		let { phone } = req.body;
		if (!phone) return res.status(404).send({ status: false, msg: "Please provide a number !!" });

		const { normalizePhone } = require("../util/normalizeCandidateData");
		phone = normalizePhone(phone);

		const findNumber = await User.findOne({ phone });
		if (findNumber) {
			return res.status(200).send({ status: true, firstTime: false, msg: "This number is already registered !!" });
		} else {
			let finalUserType = req.body.userType && req.body.userType.trim() ? req.body.userType.trim() : "jobSeeker";
			if (finalUserType === "company") finalUserType = "companyRecruiter";
			if (finalUserType === "recruiter") finalUserType = "individualRecruiter";

			await User.create({ phone, userType: finalUserType });
			return res.status(200).send({ status: true, firstTime: true, msg: "This number is not registered" });
		}
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.getToken = async (req, res) => {
	try {
		let { phone, userType } = req.body;
		console.log(phone);
		if (!phone) return res.status(404).send({ status: false, msg: "Please provide number !!" });

		const { normalizePhone } = require("../util/normalizeCandidateData");
		phone = normalizePhone(phone);

		const findNumber = await User.findOne({ phone });
		if (!findNumber) return res.status(401).send({ status: false, msg: "Phone is wrong, Please try again !!" });

		let update;
		const { calculateProfileComplete: calcScore } = require("../util/normalizeCandidateData");
		if (userType.trim())
			update = await User.findByIdAndUpdate(findNumber._id, { $set: { userType, profileComplete: Math.max(10, calcScore(findNumber)) } }, { new: true });
		else update = await User.findByIdAndUpdate(findNumber._id, { $set: { otp: "" } }, { new: true });

		const token = jwt.sign({ _id: update._id }, JWT_SECRET, {
			expiresIn: "60d",
		});

		return res.status(200).send({
			status: true,
			userId: update._id,
			phone: update.phone,
			userType: update.userType,
			userData: update,
			token,
			msg: "Login successfully !!",
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.removeVideo = async (req, res) => {
	try {
		const { id } = req.params;

		const user = await User.findOne({ _id: id });
		if (!user) return res.status(404).json({ status: false, msg: "User doesn't exits !!" });
		if (user.videoUrl === "") return res.status(404).json({ status: false, msg: "User doesn't have a video !!" });

		const deleteResponse = await deleteFromFirebase(user.videoUrl);
		const { calculateProfileComplete } = require("../util/normalizeCandidateData");
		user.videoUrl = "";
		user.profileComplete = calculateProfileComplete(user);
		await user.save();

		return res.status(200).send({
			status: true,
			msg: "Video deleted successfully !!",
			data: user,
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.removeProfile = async (req, res) => {
	try {
		const { id } = req.params;

		const user = await User.findOne({ _id: id });
		if (!user) return res.status(404).json({ status: false, msg: "User doesn't exits !!" });
		if (user.profileImage === "") return res.status(404).json({ status: false, msg: "User doesn't have a profile image !!" });

		const deleteResponse = await deleteFromFirebase(user.profileImage);
		if (!deleteResponse) throw Error("Error in deleting profile image from firebase");
		user.profileImage =
			"https://firebasestorage.googleapis.com/v0/b/hiringroof.appspot.com/o/static%20data%2FAvtar.png?alt=media&token=5a84bf05-8bec-4f7b-b9f3-deb8205b8cef";
		const { calculateProfileComplete } = require("../util/normalizeCandidateData");
		user.profileComplete = calculateProfileComplete(user);
		await user.save();

		return res.status(200).send({
			status: true,
			msg: "Video successfully !!",
			data: user,
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.blockUnblock = async (req, res) => {
	try {
		const { id, block, reason } = req.body;

		let blockData = {};
		if (block)
			blockData = {
				reason,
				date: new Date(),
				blockedBy: req.user._id,
			};
		else
			blockData = {
				reason: "",
				date: "",
				blockedBy: null,
			};

		const user = await User.findOne({ _id: id });
		if (!user) return res.status(404).json({ status: false, msg: "User doesn't exits !!" });

		user.blocked_status = block;
		user.blocked = blockData;
		await user.save();

		return res.status(200).send({
			status: true,
			msg: block ? "Block successfully !!" : "Unblock Successfully!!",
			data: user,
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

userController.addBadgeRemoveRequest = async (req, res) => {
	try {
		const user = req.user;
		const { reason } = req.body;

		// Check if user currently has a selected badge, custom badge, or selection history
		const hasBadge = user.selectedBadge || (user.selectionCount && user.selectionCount > 0) || (user.badge && user.badge.trim() !== "");
		if (!hasBadge) {
			return res.status(400).json({
				status: false,
				msg: "You do not have an active badge to request removal for.",
			});
		}

		// Check for existing pending request
		const existingReq = await BadgeRemoveRequestModel.findOne({
			requestedBy: user._id,
			status: "PENDING",
		});
		if (existingReq) {
			return res.status(400).json({
				status: false,
				msg: "You already have a pending badge removal request.",
			});
		}

		const removeReq = new BadgeRemoveRequestModel({
			requestedBy: user._id,
			reqReceivedOn: new Date(),
			reason: reason || "",
			status: "PENDING",
		});

		await removeReq.save();

		return res.status(201).json({
			status: true,
			msg: "Badge removal request submitted successfully!",
			data: removeReq,
		});
	} catch (error) {
		console.error("Error in addBadgeRemoveRequest:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};
userController.getMyBadgeRemoveRequests = async (req, res) => {
	try {
		const user = req.user;
		const badgeRemReq = await BadgeRemoveRequestModel.find({ requestedBy: user._id })
			.populate("servicedBy", "name email type")
			.sort({ createdAt: -1 });

		return res.status(200).json({
			status: true,
			msg: badgeRemReq.length > 0 ? "User badge removal requests fetched successfully" : "No badge removal requests found",
			count: badgeRemReq.length,
			data: badgeRemReq,
		});
	} catch (error) {
		console.error("Error in getMyBadgeRemoveRequests:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};
userController.getMyAssignedHRs = async (req, res) => {
  try {
    const recruiterId = req.user._id;

    const jobs = await jobModel.find({ userId: recruiterId, isDeleted: false })
      .select("_id jobTittle companyName location jobType vacancies createdAt");
    const hrAdmins = await adminUserModel.find({
      isDeleted: { $ne: true },
      type: { $in: ["hr", "admin", "sub-admin"] }
    }).select("_id name email number profileImage jobTarget").lean();

    // 3. Map HR details to each job
    const jobsWithHR = jobs.map(job => {
      const assignedHR = hrAdmins.find(hr => 
        hr.jobTarget && Array.isArray(hr.jobTarget) && hr.jobTarget.some(target => 
          target.jobIds && Array.isArray(target.jobIds) && target.jobIds.some(j => {
            const jId = j?.jobId?._id ? j.jobId._id.toString() : j?.jobId ? j.jobId.toString() : null;
            return jId && jId === job._id.toString();
          })
        )
      );
      return {
        ...job.toObject(),
        assignedHR: assignedHR ? {
          _id: assignedHR._id,
          name: assignedHR.name,
          email: assignedHR.email,
          phone: assignedHR.number || assignedHR.phone || "",
          profileImage: assignedHR.profileImage,
        } : null
      };
    });
    return res.status(200).json({ status: true, data: jobsWithHR });
  } catch (error) {
    return res.status(500).json({ status: false, msg: error.message });
  }
};
userController.searchUserProfile = async (req, res) => {
	try {
		const { identifier, value } = req.params;
		if (!identifier || !value) {
			return res.status(400).json({ status: false, msg: "Identifier and search value are required" });
		}

		const validIdentifiers = ["usernameSlug", "email", "phone", "name", "id", "_id"];
		if (!validIdentifiers.includes(identifier)) {
			return res.status(400).json({ status: false, msg: "A valid identifier is required (usernameSlug, email, phone, name, id, _id)" });
		}

		// 1. Build query based on identifier type
		let query = {};
		if (identifier === "phone") {
			const { normalizePhone } = require("../util/normalizeCandidateData");
			query.phone = normalizePhone(value);
		} else if (identifier === "name") {
			query.name = { $regex: value, $options: "i" }; // Case-insensitive partial match
		} else if (identifier === "id" || identifier === "_id") {
			query._id = value;
		} else {
			query[identifier] = value;
		}

		// Only show active and non-deleted profiles
		query.isDeleted = { $ne: true };

		// 2. Find the users
		const users = await User.find(query).limit(30).lean();
		if (!users || users.length === 0) {
			return res.status(404).json({ status: false, msg: "No matching profiles found" });
		}

		// 3. Sanitize profiles to protect private data for public indexing
		const sanitizedUsers = users.map(user => ({
			_id: user._id,
			name: user.name,
			profession: user.profession,
			skills: user.skills || [],
			projects: user.projects || [],
			education: user.education || [],
			about: user.about,
			profileImage: user.profileImage,
			videoUrl: user.videoUrl,
			userType: user.userType,
			createdAt: user.createdAt,
			profileComplete: user.profileComplete,
			location: user.location,
			experience: user.experience,
			currentPay: user.currentPay,
			expectationPay: user.expectationPay,
			selectedBadge: user.selectedBadge,
			isHired: user.isHired
		}));

		return res.status(200).json({
			status: true,
			msg: "Matching profiles retrieved successfully",
			data: sanitizedUsers
		});
	} catch (error) {
		console.error("Error in searchUserProfile:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// ---------------------------------------------------
// GET CANDIDATE INTRO VIDEOS (CANDIDATES ONLY)
// ---------------------------------------------------
userController.getUserIntroVideos = async (req, res) => {
	try {
		const { search = "", page = 1, limit = 50 } = req.query;

		// Strictly candidates (jobSeeker) with non-empty videoUrl
		const query = {
			userType: "jobSeeker",
			videoUrl: { $exists: true, $ne: "", $regex: /\S/ }
		};

		if (search && search.trim() !== "") {
			const searchRegex = new RegExp(search.trim(), "i");
			query.$or = [
				{ name: searchRegex },
				{ email: searchRegex },
				{ phone: searchRegex },
				{ profession: searchRegex },
				{ location: searchRegex },
				{ about: searchRegex },
				{ skills: searchRegex }
			];
		}

		const skip = (Number(page) - 1) * Number(limit);
		const total = await userModel.countDocuments(query);
		const users = await userModel
			.find(query)
			.select("name email phone profileImage userType profession videoUrl skills experience location about createdAt selectedBadge isHired")
			.sort("-createdAt")
			.skip(skip)
			.limit(Number(limit))
			.lean();

		return res.status(200).json({
			status: true,
			msg: "Candidate Intro Videos fetched successfully",
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

// ---------------------------------------------------
// VIDEO STREAM PROXY ENDPOINT (HTTP Byte Range & Google Drive Stream)
// ---------------------------------------------------
userController.streamVideo = async (req, res) => {
	try {
		const { url, userId } = req.query;
		let targetUrl = url;

		if (!targetUrl && userId) {
			const u = await userModel.findById(userId).select("videoUrl").lean();
			targetUrl = u?.videoUrl;
		}

		if (!targetUrl) {
			return res.status(404).send("Video URL not found");
		}

		// 1. Check if it's a Google Drive URL
		if (targetUrl.includes("drive.google.com") || targetUrl.includes("lh3.googleusercontent.com")) {
			try {
				const { getVideoStream } = require("../util/googleDrive.util");
				const streamData = await getVideoStream(targetUrl);
				res.setHeader("Content-Type", "video/mp4");
				res.setHeader("Accept-Ranges", "bytes");
				return streamData.pipe(res);
			} catch (gErr) {
				console.error("Error streaming video from Google Drive:", gErr);
				return res.redirect(targetUrl);
			}
		}

		// 2. Check if it's a local file path (uploads/userVideo/... or ./uploads/...)
		if (targetUrl.includes("uploads/")) {
			const path = require("path");
			const fs = require("fs");
			const relativePath = targetUrl.substring(targetUrl.indexOf("uploads/"));
			const absolutePath = path.join(__dirname, "../../", relativePath);

			if (fs.existsSync(absolutePath)) {
				const stat = fs.statSync(absolutePath);
				const fileSize = stat.size;
				const range = req.headers.range;

				if (range) {
					const parts = range.replace(/bytes=/, "").split("-");
					const start = parseInt(parts[0], 10);
					const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
					const chunksize = end - start + 1;
					const file = fs.createReadStream(absolutePath, { start, end });
					const head = {
						"Content-Range": `bytes ${start}-${end}/${fileSize}`,
						"Accept-Ranges": "bytes",
						"Content-Length": chunksize,
						"Content-Type": "video/mp4",
					};
					res.writeHead(206, head);
					return file.pipe(res);
				} else {
					const head = {
						"Content-Length": fileSize,
						"Content-Type": "video/mp4",
					};
					res.writeHead(200, head);
					return fs.createReadStream(absolutePath).pipe(res);
				}
			}
		}

		// 3. Direct HTTP(S) URL (Firebase, S3, external)
		return res.redirect(targetUrl);
	} catch (error) {
		console.error("Error in streamVideo:", error);
		return res.status(500).send("Video streaming error");
	}
};

module.exports = userController;
