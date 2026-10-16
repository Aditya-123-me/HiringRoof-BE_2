const College = require("../models/college.model");
const CampusStudent = require("../models/campusStudent.model");
const CampusRecruiter = require("../models/campusRecruiter.model");
const CampusJob = require("../models/campusJob.model");
const CampusDrive = require("../models/campusDrive.model");
const CampusInterview = require("../models/campusInterview.model");

const campusDashboardController = {};

campusDashboardController.getStats = async (req, res) => {
	try {
		const [totalColleges, totalStudents, totalRecruiters, totalJobs, totalDrives, totalInterviews, offersExtended, rejected, scheduled] = await Promise.all([
			College.countDocuments({}),
			CampusStudent.countDocuments({}),
			CampusRecruiter.countDocuments({}),
			CampusJob.countDocuments({ status: "Published" }),
			CampusDrive.countDocuments({}),
			CampusInterview.countDocuments({}),
			CampusInterview.countDocuments({ status: "Offer Extended" }),
			CampusInterview.countDocuments({ status: "Rejected" }),
			CampusInterview.countDocuments({ status: "Scheduled" }),
		]);

		const placementRate = totalInterviews > 0 ? Math.round((offersExtended / totalInterviews) * 10000) / 100 : 0;

		return res.status(200).json({
			status: true,
			msg: "Dashboard stats fetched successfully !!",
			data: {
				totalColleges,
				totalStudents,
				totalRecruiters,
				totalJobs,
				totalDrives,
				totalInterviews,
				offersExtended,
				rejected,
				scheduled,
				placementRate,
			},
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while fetching dashboard stats !!" });
	}
};

campusDashboardController.getDepartmentProgress = async (req, res) => {
	try {
		const placedStudentIds = await CampusInterview.distinct("candidate_id", { status: "Offer Extended" });

		const departments = await CampusStudent.aggregate([
			{
				$group: {
					_id: { $cond: [{ $eq: [{ $ifNull: ["$branch", ""] }, ""] }, "Unassigned", "$branch"] },
					totalStudents: { $sum: 1 },
					placedStudents: { $sum: { $cond: [{ $in: ["$_id", placedStudentIds] }, 1, 0] } },
				},
			},
			{
				$addFields: {
					department: "$_id",
					placementPercentage: {
						$cond: [
							{ $eq: ["$totalStudents", 0] },
							0,
							{ $round: [{ $multiply: [{ $divide: ["$placedStudents", "$totalStudents"] }, 100] }, 2] },
						],
					},
				},
			},
			{ $project: { _id: 0, department: 1, totalStudents: 1, placedStudents: 1, placementPercentage: 1 } },
			{ $sort: { placementPercentage: -1, totalStudents: -1 } },
		]);

		return res.status(200).json({
			status: true,
			msg: "Department-wise placement progress fetched successfully !!",
			data: { departments },
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while fetching department progress !!" });
	}
};

module.exports = campusDashboardController;
