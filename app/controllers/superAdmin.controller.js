const adminUserModel = require("../models/adminUser.model");
const RejectedInterview = require("../models/rejected.model");
const { imageUpload } = require("../util/firebase.util");
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
		const { hrId, interviewField, month, InterviewDone, RescheduledInterview } = req.query;

		let hrFilter = { $or: [{ type: "hr" }, { type: "admin" }] }; // Filter object for HR query
		if (hrId && ObjectId.isValid(hrId)) {
			hrFilter._id = hrId;
		}

		// Fetch HR(s) based on provided hrId or fetch all HRs if hrId is not provided
		const hrs = await adminUserModel.find(hrFilter);

		const currentDate = new Date(); // Get the current date/time

		const interviewsPassedDate = [];

		// Iterate through each HR or just use the single HR if hrId is provided
		for (const hr of hrs) {
			const jobIds = hr.jobTarget.flatMap((target) => target.jobIds.map((idObj) => idObj.jobId));

			const jobApplications = await JobApplication.find({
				jobId: { $in: jobIds },
			}).populate("applicantId applierId jobId");

			// Filter for passed interview dates with the specified month
			const passedInterviews = jobApplications.filter((application) => {
				let interviewPending;
				if (interviewField === "interviews2") {
					interviewPending = application.interviewStatus && application.interviewStatus["interview2Pending"] === true;
				} else {
					interviewPending = application.interviewStatus && application.interviewStatus["interviewPending"] === true;
				}

				// Check if interview is done within the specified month
				const interviewDoneInMonth =
					(application.interviewStatus.timestamp1 &&
						new Date(application.interviewStatus.timestamp1).getMonth() === parseInt(month) - 1) ||
					(application.interviewStatus.timestamp2 &&
						new Date(application.interviewStatus.timestamp2).getMonth() === parseInt(month) - 1);

				// Check if there are rescheduled interviews
				const hasRescheduledInterviews = application.rescheduledInterviews.length > 0;

				return (
					interviewPending &&
					new Date(application[`${interviewField}Date`]) < currentDate &&
					new Date(application[`${interviewField}Date`]).getMonth() === parseInt(month) - 1 &&
					(InterviewDone === "true" ? interviewDoneInMonth : true) &&
					(RescheduledInterview === "true" ? hasRescheduledInterviews : true)
				);
			});

			// Add HR details to each application/job
			const hrDetails = passedInterviews.map((application) => ({
				...application.toObject(),
				hr_detail: hr, // Add HR details to each application/job
			}));

			interviewsPassedDate.push(...hrDetails);
		}

		return res.status(200).send({
			status: true,
			msg: "Here are the listed employees with interviews passed date !!",
			data: interviewsPassedDate,
		});
	} catch (error) {
		console.error(error);
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

module.exports = superAdmin;
