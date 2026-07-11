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

const adminUser = {};

adminUser.hrLogin = async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await adminUserModel.findOne({ email, password, type: "hr" });
		if (!user) return res.status(404).send({ status: false, msg: "Invalid Email or Password !!", data: [] });
		if (user.type !== "hr")
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

adminUser.create = async (req, res) => {
	try {
		const { name, email, password, type, address, number } = req.body;
		if (name === "" || email === "" || password === "" || type === "" || address === "" || number === "")
			return res.status(404).send({ status: false, msg: "Please add all data", data: [] });

		const user = await adminUserModel.findOne({ email });
		if (user) return res.status(404).send({ status: false, msg: "Email Already Present !!", data: [] });
		const adminUserCount = await adminUserModel.countDocuments();

		const bodyData = {};
		bodyData.name = name;
		bodyData.email = email;
		bodyData.password = password;
		bodyData.type = type;
		bodyData.address = address;
		bodyData.number = number;
		bodyData.userId = `${name.split(" ")[0]}_${adminUserCount}`;
		if (req.file) {
			const imgUrl = await imageUpload(req.file, `${bodyData.userId}_userImage`, "userImage");
			bodyData.profileImage = imgUrl;
		}
		bodyData.referralCode = bodyData.userId;

		const newUser = await adminUserModel.create(bodyData);

		return res.status(200).send({ status: true, msg: "User Created Successfully !!", data: newUser });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.update = async (req, res) => {
	try {
		const id = req.params.id;
		const user = await adminUserModel.findOne({ _id: id });
		if (!user) return res.status(404).send({ status: false, msg: "Invalid User Id !!", data: [] });

		const { name, email, password, type, address, number } = req.body;

		const bodyData = {};
		if (name) bodyData.name = name;
		if (email) {
			const userEmail = await adminUserModel.find({ email });
			if (userEmail.length > 0 && email !== user.email)
				return res.status(404).send({ status: false, msg: "Email Already Present !!", data: [] });
			bodyData.email = email;
		}
		if (password) bodyData.password = password;
		if (type) bodyData.type = type;
		if (address) bodyData.address = address;
		if (number) bodyData.number = number;

		if (req.file) {
			const imgUrl = await imageUpload(req.file, `${user.userId}_userImage`, "userImage");
			bodyData.profileImage = imgUrl;
		}

		const updateUser = await adminUserModel.findByIdAndUpdate(id, { $set: bodyData }, { new: true });

		return res.status(200).send({ status: true, msg: "User Update Successfully !!", data: updateUser });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.getOne = async (req, res) => {
	try {
		const id = req.params.id;
		const adminUser = await adminUserModel.findOne({ _id: id });

		return res.status(200).send({ status: true, msg: "User Fetch Successfully !!", data: adminUser });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.getAll = async (req, res) => {
	try {
		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 10;
		const skip = limit * (page - 1);
		const type = req.query.type ? req.query.type : "all";

		const filter = {};

		filter.isDeleted = false;
		filter.type = { $ne: "superAdmin", $eq: type };
		if (req.query.search) filter.name = new RegExp(req.query.search, "i");

		let adminUserCount;
		let adminUsers;
		if (type === "all") {
			adminUserCount = await adminUserModel.countDocuments({ isDeleted: false, type: { $ne: "superAdmin" } });
			adminUsers = await adminUserModel
				.find({ isDeleted: false, type: { $ne: "superAdmin" } })
				.limit(limit)
				.skip(skip);
		} else {
			adminUserCount = await adminUserModel.countDocuments(filter);
			adminUsers = await adminUserModel.find(filter).limit(limit).skip(skip);
		}

		return res.status(200).send({
			status: true,
			msg: "Fetch All Users Successfully !!",
			currentPage: parseInt(page),
			pageCount: parseInt(Math.ceil(adminUserCount / limit)),
			userCount: adminUserCount,
			data: adminUsers,
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.getDeleteUsers = async (req, res) => {
	try {
		const adminUserCount = await adminUserModel.countDocuments({ isDeleted: false, type: { $ne: "superAdmin" } });
		const adminUsers = await adminUserModel.find({ isDeleted: false, type: { $ne: "superAdmin" } });

		return res
			.status(200)
			.send({ status: true, msg: "Fetch All Deleted Users Successfully !!", count: adminUserCount, data: adminUsers });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.deleteUser = async (req, res) => {
	try {
		const id = req.params.id;
		const user = await adminUserModel.findOne({ _id: id });
		if (!user) return res.status(404).send({ status: false, msg: "Invalid User Id !!", data: [] });

		const adminUser = await adminUserModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
		return res.status(200).send({ status: true, msg: "User Deleted Successfully !!", data: adminUser });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.permanentlyDelete = async (req, res) => {
	try {
		const id = req.params.id;
		const user = await adminUserModel.findOne({ _id: id });
		if (!user) return res.status(404).send({ status: false, msg: "Invalid User Id !!", data: [] });

		const adminUser = await adminUserModel.findByIdAndDelete(id);
		return res.status(200).send({ status: true, msg: "User Permanently Delete Successfully !!", data: adminUser });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.setJobTarget = async (req, res) => {
	try {
		const id = req.params.id;
		const user = await adminUserModel.findOne({ _id: id });
		if (!user) return res.status(404).send({ status: false, msg: "Invalid User Id !!", data: [] });

		const jobsTarget = req.body.jobsTarget;
		const year = String(req.body.year);
		const month = req.body.month.toLowerCase();

		const isPresent = user.jobTarget.some((obj) => obj.year === year && obj.month.toLowerCase() === month);

		if (isPresent)
			return res.status(404).send({
				status: false,
				msg: `${year} ${month} job target already added. Please edit your response.`,
				data: user.jobTarget,
			});

		const data = {
			year: year,
			month: month,
			jobsTarget: jobsTarget,
		};

		user.jobTarget.push(data);

		// Calculate totalJobsAssigned as the sum of all jobsTarget
		let totalJobsAssigned = 0;
		for (const target of user.jobTarget) {
			totalJobsAssigned += target.jobsTarget;
		}
		user.totalJobsAssigned = totalJobsAssigned;

		await user.save();

		return res.status(200).send({ status: true, msg: "User Successfully !!", data: user });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.updateJobTarget = async (req, res) => {
	try {
		const { userId, targetMonth } = req.query;
		const user = await adminUserModel.findOne({ _id: userId });
		if (!user) return res.status(404).send({ status: false, msg: "Invalid User Id !!", data: [] });

		let target = user.jobTarget.findIndex((item) => item._id.toString() === targetMonth);
		if (target === -1) return res.status(404).send({ status: false, msg: `No job target found for this id.`, data: [] });

		const { jobTarget } = req.body;

		user.jobTarget[target].jobsTarget = jobTarget;
		await user.save();

		// Recalculate totalJobsAssigned
		let totalJobsAssigned = 0;
		for (const target of user.jobTarget) if (target.jobsTarget) totalJobsAssigned += target?.jobsTarget;
		user.totalJobsAssigned = totalJobsAssigned;
		await user.save();

		return res.status(200).send({ status: true, msg: "User Successfully !!", data: user.jobTarget });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.assignJob = async (req, res, io) => {
	try {
		const { year, month, userId, jobIds } = req.body;

		// Validate user
		const user = await adminUserModel.findOne({ _id: userId });
		if (!user) return res.status(404).send({ status: false, msg: "Invalid User ID!", data: [] });

		// Validate job IDs and ensure they are valid ObjectIDs
		const jobIdsArray = Array.isArray(jobIds) ? jobIds : [];
		if (jobIdsArray.length === 0) return res.status(400).send({ status: false, msg: "No job IDs provided!", data: [] });

		// Validate job target
		let targetIndex = user.jobTarget.findIndex((obj) => obj.year === year && obj.month.toLowerCase() === month.toLowerCase());
		if (targetIndex === -1) {
			// FIXME: pre month target or 0
			const data = {
				year: year,
				month: month.toLowerCase(),
				jobsTarget: 0,
			};

			user.jobTarget.push(data);
			await user.save();
			targetIndex = 0;
		}
		const isPresent = user.jobTarget.find((obj) => obj.year === year && obj.month.toLowerCase() === month.toLowerCase());

		// Iterate through each job ID and assign to user if not already assigned
		for (const jobId of jobIdsArray) {
			// Validate job
			const job = await jobModel.findOne({ _id: jobId });
			if (!job) continue; // Skip invalid job ID

			// Check if the job is already assigned for the specified year and month
			const jobIndex = isPresent.jobIds.findIndex((obj) => obj.jobId.toString() === jobId);
			if (jobIndex !== -1) continue; // Skip if job already assigned

			// Assign job to user
			const data = {
				jobId,
				process: "inProcess",
			};
			user.jobTarget[targetIndex].jobIds.push(data);
		}

		// Save the updated user
		await user.save();

		// Create notification if user type is superAdmin
		if (req.user?.type === "superAdmin") {
			for (const jobId of jobIdsArray) {
				const job = await jobModel.findOne({ _id: jobId });
				if (!job) continue; // Skip invalid job ID

				const data = await createNotification({
					senderType: "adminUser",
					receiverType: "adminUser",
					senderId: req.user._id.toString(),
					receiverId: userId,
					title: `Job Assigned by admin`,
					desc: `${job.jobTittle} job is assigned to you`,
					logo: job.companyLogo,
				});

				io.emit(`notifications_${data.receiverId._id}`, data);
			}
		}

		// Return success response
		return res.status(200).send({ status: true, msg: "Jobs assigned successfully!", data: user.jobTarget });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.removeAssignJob = async (req, res) => {
	try {
		if (req.user.type !== "superAdmin")
			return res.status(406).send({ status: false, msg: "You don't have permission to remove assign job !!", data: [] });

		const { jobsTargetId, userId, jobId } = req.body;

		const user = await adminUserModel.findOne({ _id: userId });
		if (!user) return res.status(404).send({ status: false, msg: "Invalid User Id !!", data: [] });

		const isPresent = user.jobTarget.find((obj) => obj._id.toString() === jobsTargetId);
		let targetIndex = user.jobTarget.findIndex((obj) => obj._id.toString() === jobsTargetId);
		if (targetIndex === -1) return res.status(404).send({ status: false, msg: `No job target found for this id.`, data: [] });

		const jobIndex = isPresent.jobIds.findIndex((obj) => obj.jobId.toString() === jobId);
		if (jobIndex === -1)
			return res.status(404).send({ status: false, msg: `This job not assign yet.`, data: user.jobTarget });

		user.jobTarget[targetIndex].jobIds.splice(jobIndex, 1);
		await user.save();

		return res.status(200).send({ status: true, msg: "Job Remove Successfully !!", data: user.jobTarget });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.getAssignJob = async (req, res) => {
	try {
		const { userId } = req.params;

		const user = await adminUserModel.findOne({ _id: userId }).populate({
			path: "jobTarget.jobIds.jobId",
			populate: [
				{
					path: "userId",
					select: "email phone type profileImage name companyName companyLogo",
				},
			],
		});
		if (!user) return res.status(404).send({ status: false, msg: "Invalid User Id !!", data: [] });

		const { year, month } = req.query;
		const isPresent = user.jobTarget.findIndex((obj) => obj.year === year && obj.month.toLowerCase() === month.toLowerCase());
		if (isPresent === -1)
			return res.status(404).send({ status: false, msg: `This month you don't have any assigned job yet.`, data: [] });

		return res.status(200).send({ status: true, msg: "Job Fetch Successfully !!", data: user.jobTarget[isPresent] });
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, msg: error.message });
	}
};

adminUser.getJobApplicationsHRdetails = async (req, res) => {
	const { jobId } = req.params;
	const { page = 1, limit = 10 } = req.query;

	try {
		// Fetch job details
		const job = await jobModel.findById(jobId);
		if (!job) return res.status(404).json({ status: false, message: "Job not found" });

		// Calculate skip and limit for pagination
		const skip = (page - 1) * limit;

		// Fetch job applications for the given job ID with pagination and sorting
		const jobApplications = await JobApplication.find({ jobId }).skip(skip).limit(Number(limit)).sort("-createdAt"); // Sort by date in descending order

		// Calculate statistics
		let interviewScheduled = 0;
		let interviewTaken = 0;
		let totalSelectedCandidates = 0;
		const candidateIds = [];

		jobApplications.forEach((application) => {
			if (application.interviews || application.interviews2) {
				interviewScheduled++;
			}

			if (application.interviewStatus) {
				const { interviewPending, interview2Pending } = application.interviewStatus;

				// Increment interviewTaken count if interviewPending is false
				if (interviewPending === false && interview2Pending === false) {
					interviewTaken++;
				}
			}

			// Count selected candidates
			if (application.selectedCandidates) {
				totalSelectedCandidates++;
			}

			// Collect candidate IDs to fetch user details later
			candidateIds.push(application.applicantId);
		});

		// Fetch user details for candidates
		const candidates = await User.find({ _id: { $in: candidateIds } });
		const totalCandidatesApplied = await JobApplication.countDocuments({ jobId });

		// Return the job details and statistics as JSON response
		res.json({
			status: true,
			page: Number(page),
			data: {
				job,
				interviewScheduled,
				interviewTaken,
				totalSelectedCandidates,
				totalCandidatesApplied,
				candidates,
			},
			msg: "Job data fetch Successfully !!",
		});
	} catch (error) {
		console.error("Error fetching job details:", error);
		res.status(500).json({ status: false, msg: error.message });
	}
};

adminUser.getUnassignedJobs = async (req, res) => {
	const { page = 1, limit = 10, serviceType, location, jobTitle } = req.query;

	try {
		// Fetch admin users
		const adminUsers = await adminUserModel.find();

		// Collect all job IDs that are assigned to any admin
		const assignedJobIds = new Set();
		adminUsers.forEach((adminUser) => {
			adminUser.jobTarget.forEach((target) => {
				target.jobIds.forEach((jobTarget) => {
					assignedJobIds.add(jobTarget.jobId.toString());
				});
			});
		});

		// Build the query filter for unassigned jobs
		const filter = {
			_id: { $nin: Array.from(assignedJobIds) },
		};

		// Add optional filters based on request parameters
		if (serviceType) filter.serviceType = serviceType;
		if (location) filter.location = location;
		if (jobTitle) filter.jobTittle = jobTitle;

		// Calculate skip and limit for pagination
		const skip = (page - 1) * limit;

		// Fetch unassigned jobs with filtering, sorting, and pagination
		const unassignedJobs = await jobModel
			.find(filter)
			.sort("-createdAt") // Sort by date in descending order
			.skip(skip)
			.limit(Number(limit));

		// Fetch number of applications for each job
		const applicationCounts = await JobApplication.aggregate([
			{
				$match: {
					jobId: {
						$in: unassignedJobs.map((job) => job._id),
					},
				},
			},
			{
				$group: {
					_id: "$jobId",
					count: { $sum: 1 },
					applicants: { $addToSet: "$applicantId" }, // Accumulate applicantIds for each job
				},
			},
		]);

		// Create a map to store application counts and applicantIds by job ID
		const applicationInfoMap = {};
		applicationCounts.forEach((appCount) => {
			applicationInfoMap[appCount._id.toString()] = {
				count: appCount.count,
				applicants: appCount.applicants,
			};
		});

		// Fetch profile images for each applicantId
		const getProfileImagesPromises = unassignedJobs.map(async (job) => {
			const applicantIds = applicationInfoMap[job._id.toString()] ? applicationInfoMap[job._id.toString()].applicants : [];
			const profileImages = await getProfileImages(applicantIds);
			return {
				jobId: job._id,
				profileImages: profileImages,
			};
		});

		// Wait for all promises to resolve
		const jobsWithProfileImages = await Promise.all(getProfileImagesPromises);

		// Replace the applicants field with profile images in the response
		const jobsWithApplications = unassignedJobs.map((job) => {
			const applicationInfo = applicationInfoMap[job._id.toString()] || { count: 0, applicants: [] };
			const profileImages = jobsWithProfileImages.find(
				(item) => item.jobId.toString() === job._id.toString()
			).profileImages;
			return {
				...job.toObject(),
				applicationCount: applicationInfo.count,
				profileImages: profileImages,
			};
		});

		// Return the jobs with application counts and profile images as JSON response
		res.json({
			status: true,
			page: Number(page),
			count: jobsWithApplications.length,
			data: jobsWithApplications,
			msg: "Success",
		});
	} catch (error) {
		console.error("Error fetching unassigned jobs:", error);
		res.status(500).json({ status: false, msg: error.message });
	}
};

adminUser.getJobHRdetails = async (req, res) => {
	const { adminId, process, serviceType, page = 1, limit = 10 } = req.query;

	try {
		// Find the admin user by adminId
		const adminUser = await adminUserModel.findById(adminId);
		if (!adminUser) {
			return res.status(404).json({ status: false, msg: "Admin not found" });
		}

		// Filter job targets based on the provided process filter
		const filteredJobTargets = adminUser.jobTarget
			.filter((target) => target.jobIds.some((job) => job.process === process))
			.reduce((acc, target) => acc.concat(target.jobIds), [])
			.filter((job) => job.process === process);

		// Extract job IDs from the filtered job targets
		const jobIds = filteredJobTargets.map((job) => job.jobId);

		// Find jobs based on job IDs, serviceType filter, and in descending order of date
		const jobsQuery = jobModel
			.find({
				_id: { $in: jobIds },
				serviceType: serviceType, // Filter based on serviceType
			})
			.sort("-createdAt");

		// Apply pagination
		const skip = (page - 1) * limit;
		jobsQuery.skip(skip).limit(Number(limit));

		// Fetch the jobs
		const jobs = await jobsQuery.exec();

		// Fetch the number of job applications for each job
		const applicationCounts = await JobApplication.aggregate([
			{
				$match: {
					jobId: {
						$in: jobIds,
					},
				},
			},
			{
				$group: {
					_id: "$jobId",
					count: { $sum: 1 },
				},
			},
		]);

		// Create a map to store application counts by job ID
		const applicationCountMap = {};
		applicationCounts.forEach((appCount) => {
			applicationCountMap[appCount._id.toString()] = appCount.count;
		});

		// Fetch additional statistics for each job
		const jobStatisticsPromises = jobs.map(async (job) => {
			// Fetch job applications for the job ID
			const jobApplications = await JobApplication.find({ jobId: job._id });

			// Extract applicantIds from job applications
			const applicantIds = jobApplications.map((application) => application.applicantId);

			// Calculate statistics for the job
			let interviewScheduled = 0;
			let interviewTaken = 0;
			let totalSelectedCandidates = 0;

			jobApplications.forEach((application) => {
				if (application.interviews || application.interviews2) {
					interviewScheduled++;
				}

				if (application.interviewStatus) {
					const { interviewPending, interview2Pending } = application.interviewStatus;

					if (interviewPending === false && interview2Pending === false) {
						interviewTaken++;
					}
				}

				if (application.selectedCandidates) {
					totalSelectedCandidates++;
				}
			});
			const profileImages = await getProfileImages(applicantIds);
			return {
				...job.toObject(),
				applicationCount: applicationCountMap[job._id.toString()] || 0,
				interviewScheduled,
				interviewTaken,
				totalSelectedCandidates,
				profileImages, // Adding the applicantIds to the returned object
			};
		});

		// Wait for all promises to resolve
		const jobsWithStatistics = await Promise.all(jobStatisticsPromises);

		// Return the jobs with application counts and statistics as JSON response
		res.json({
			status: true,
			page: Number(page),
			count: jobsWithStatistics.length,
			data: jobsWithStatistics,
			msg: "Assign Job data fetch successfully !!",
		});
	} catch (error) {
		console.error("Error fetching admin jobs:", error);
		res.status(500).json({ status: false, msg: error.msg });
	}
};

adminUser.updateInterviewStatus = async (req, res) => {
	const { adminID, jobApplicationID, interview_type } = req.body;

	try {
		// Validate the input
		if (!ObjectId.isValid(adminID) || !ObjectId.isValid(jobApplicationID)) {
			return res.status(400).json({ status: false, msg: "Invalid adminID or jobApplicationID" });
		}

		// Find the HR admin by ID
		const hrAdmin = await adminUserModel.findById(adminID);
		if (!hrAdmin) {
			return res.status(404).json({ status: false, msg: "HR admin not found" });
		}

		// Increase the interviewTaken count by 1
		hrAdmin.interviewTaken += 1;
		await hrAdmin.save();

		// Find the job application by ID
		const application = await JobApplication.findById(jobApplicationID);
		if (!application) {
			return res.status(404).json({ status: false, msg: "Job application not found" });
		}
		// Determine the interview type and update the respective field
		let updateField;
		let timestampField;
		if (interview_type === "interviews") {
			updateField = "interviewStatus.interviewPending";
			timestampField = "interviewStatus.timestamp1";
		} else if (interview_type === "interviews2") {
			updateField = "interviewStatus.interview2Pending";
			timestampField = "interviewStatus.timestamp2";
		} else {
			return res.status(400).json({ status: false, msg: "Invalid interview_type" });
		}

		// Update the job application
		const updateData = {
			[updateField]: true,
			[timestampField]: new Date(),
			"interviewStatus.takenBy": adminID,
		};
		const data = await JobApplication.findByIdAndUpdate(jobApplicationID, updateData, { new: true });

		// Send a success response
		res.status(200).json({ status: true, msg: "Interview status updated successfully", data: data });
	} catch (error) {
		// Handle errors
		console.error(error);
		res.status(500).json({ status: false, msg: "An error occurred while updating interview status" });
	}
};

adminUser.rejectInterview = async (req, res, io) => {
	try {
		const { jobApplicationId, interviewType, rejectedReason, desc, rejectedBy } = req.body;

		const jobApplication = await JobApplication.findById(jobApplicationId).populate("jobId");
		if (!jobApplication) return res.status(404).json({ status: false, message: "Job Application not found" });

		jobApplication[`${interviewType}Date`] = "";
		jobApplication[`${interviewType}Time`] = "";
		jobApplication[interviewType] = false;
		jobApplication.shortlist = true;

		await jobApplication.save();

		// Create a record in the RejectedInterview model
		const rejectedInterview = new RejectedInterview({
			jobId: jobApplication.jobId._id,
			appId: jobApplication._id,
			applicantId: jobApplication.applicantId,
			applierId: jobApplication.applierId,
			rejected_reason: rejectedReason,
			desc: desc,
			rejected_by: rejectedBy,
			interview_type: interviewType,
		});

		await rejectedInterview.save();
		
		const data1 = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id.toString(),
			receiverId: jobApplication.applicantId,
			title: `Interview rejected by Hr admin`,
			desc: `${jobApplication.jobId.jobTittle} interview rejected by HR admin.`,
			logo: jobApplication.jobId.companyLogo,
		});
		const data2 = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id.toString(),
			receiverId: jobApplication.applierId,
			title: `Interview rejected by Hr admin`,
			desc: `${jobApplication.jobId.jobTittle} ${interviewType} rejected by HR admin.`,
			logo: jobApplication.jobId.companyLogo,
		});

		io.emit(`notifications_${data1.receiverId._id}`, data1);
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).json({ status: true, message: "Interview rejected successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, message: error.message });
	}
};

module.exports = adminUser;
