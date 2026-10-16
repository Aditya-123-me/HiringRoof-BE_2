const mongoose = require("mongoose");
const CampusInterview = require("../models/campusInterview.model");
const CampusStudent = require("../models/campusStudent.model");
const CampusRecruiter = require("../models/campusRecruiter.model");
const College = require("../models/college.model");

const campusInterviewController = {};

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const INTERVIEW_STATUSES = ["Scheduled", "Offer Extended", "Rejected"];

campusInterviewController.scheduleInterview = async (req, res) => {
	try {
		const { candidate_id, company_id, college_id, interview_date, time_slot, round_name, panelist_name, panelist_email } = req.body;

		const requiredFields = { candidate_id, company_id, college_id, interview_date, time_slot, round_name, panelist_name, panelist_email };

		for (const field of Object.keys(requiredFields)) {
			const value = requiredFields[field];
			if (value === undefined || value === null || (typeof value === "string" && value.trim() === ""))
				return res.status(400).json({ status: false, msg: `${field} is required !!` });
		}

		if (!mongoose.Types.ObjectId.isValid(candidate_id))
			return res.status(400).json({ status: false, msg: "Invalid candidate_id !!" });

		if (!mongoose.Types.ObjectId.isValid(company_id))
			return res.status(400).json({ status: false, msg: "Invalid company_id !!" });

		if (!mongoose.Types.ObjectId.isValid(college_id))
			return res.status(400).json({ status: false, msg: "Invalid college_id !!" });

		if (isNaN(new Date(interview_date).getTime()))
			return res.status(400).json({ status: false, msg: "interview_date must be a valid date !!" });

		if (!EMAIL_REGEX.test(String(panelist_email).trim()))
			return res.status(400).json({ status: false, msg: "Please provide a valid panelist_email !!" });

		const candidate = await CampusStudent.findById(candidate_id).lean();
		if (!candidate)
			return res.status(404).json({ status: false, msg: "Candidate not found !!" });

		const company = await CampusRecruiter.findById(company_id).lean();
		if (!company)
			return res.status(404).json({ status: false, msg: "Company / recruiter not found !!" });

		const college = await College.findById(college_id).lean();
		if (!college)
			return res.status(404).json({ status: false, msg: "College not found !!" });

		const interview = await CampusInterview.create({
			candidate_id,
			company_id,
			college_id,
			interview_date: new Date(interview_date),
			time_slot: String(time_slot).trim(),
			round_name: String(round_name).trim(),
			panelist_name: String(panelist_name).trim(),
			panelist_email: String(panelist_email).trim().toLowerCase(),
		});

		return res.status(201).json({ status: true, msg: "Interview scheduled successfully !!", data: interview });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while scheduling the interview !!" });
	}
};

campusInterviewController.getInterviews = async (req, res) => {
	try {
		const { status, date, college_id } = req.query;
		const page = Number(req.query.page) >= 1 ? Number(req.query.page) : 1;
		const limit = Number(req.query.limit) >= 1 ? Number(req.query.limit) : 10;

		const filters = {};

		if (status && String(status).trim()) {
			const statusFilter = String(status).trim();
			if (!INTERVIEW_STATUSES.includes(statusFilter))
				return res.status(400).json({ status: false, msg: `status must be one of ${INTERVIEW_STATUSES.join(", ")} !!` });
			filters.status = statusFilter;
		}

		if (date && String(date).trim()) {
			const parsedDate = new Date(date);
			if (isNaN(parsedDate.getTime()))
				return res.status(400).json({ status: false, msg: "date must be a valid date in YYYY-MM-DD format !!" });

			const startOfDay = new Date(parsedDate);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(parsedDate);
			endOfDay.setHours(23, 59, 59, 999);

			filters.interview_date = { $gte: startOfDay, $lte: endOfDay };
		}

		if (college_id && String(college_id).trim()) {
			if (!mongoose.Types.ObjectId.isValid(college_id))
				return res.status(400).json({ status: false, msg: "Invalid college_id filter !!" });
			filters.college_id = college_id;
		}

		const skip = limit * (page - 1);

		const interviews = await CampusInterview.find(filters)
			.populate("candidate_id", "name email rollNumber degree branch cgpa")
			.populate("company_id", "company_name")
			.populate("college_id", "college_name city")
			.sort({ interview_date: -1, createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();
		const interviewCount = await CampusInterview.countDocuments(filters);

		return res.status(200).json({
			status: true,
			msg: "Interviews fetched successfully !!",
			interviewCount,
			pageCount: parseInt(Math.ceil(interviewCount / limit)),
			currentPage: page,
			interviews,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while fetching interviews !!" });
	}
};

campusInterviewController.updateInterviewStatus = async (req, res) => {
	try {
		const { interview_id } = req.params;
		const { status } = req.body;

		if (!interview_id || !mongoose.Types.ObjectId.isValid(interview_id))
			return res.status(400).json({ status: false, msg: "Invalid interview_id !!" });

		if (!status || !INTERVIEW_STATUSES.includes(status))
			return res.status(400).json({ status: false, msg: `status must be one of ${INTERVIEW_STATUSES.join(", ")} !!` });

		const interview = await CampusInterview.findByIdAndUpdate(interview_id, { status }, { new: true, runValidators: true })
			.populate("candidate_id", "name email rollNumber")
			.populate("company_id", "company_name")
			.populate("college_id", "college_name")
			.lean();

		if (!interview)
			return res.status(404).json({ status: false, msg: "Interview not found !!" });

		return res.status(200).json({ status: true, msg: "Interview status updated successfully !!", data: interview });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while updating the interview status !!" });
	}
};

module.exports = campusInterviewController;
