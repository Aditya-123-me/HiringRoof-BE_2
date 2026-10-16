const mongoose = require("mongoose");
const CampusJob = require("../models/campusJob.model");
const CampusRecruiter = require("../models/campusRecruiter.model");
const CampusStudent = require("../models/campusStudent.model");

const campusJobController = {};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

campusJobController.createJob = async (req, res) => {
	try {
		const { company_id, role_category, position_title, package_range, openings_count, location, min_cgpa, eligible_degrees, mandatory_skills } = req.body;

		const requiredFields = { company_id, role_category, position_title, package_range, openings_count, location, min_cgpa, eligible_degrees, mandatory_skills };

		for (const field of Object.keys(requiredFields)) {
			const value = requiredFields[field];
			const isEmpty = value === undefined || value === null || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.filter(Boolean).length === 0);
			if (isEmpty) return res.status(400).json({ status: false, msg: `${field} is required !!` });
		}

		if (!mongoose.Types.ObjectId.isValid(company_id))
			return res.status(400).json({ status: false, msg: "Invalid company_id !!" });

		if (!Array.isArray(eligible_degrees))
			return res.status(400).json({ status: false, msg: "eligible_degrees must be an array !!" });

		if (!Array.isArray(mandatory_skills))
			return res.status(400).json({ status: false, msg: "mandatory_skills must be an array !!" });

		const openings = Number(openings_count);
		if (isNaN(openings) || openings < 1)
			return res.status(400).json({ status: false, msg: "openings_count must be a number greater than 0 !!" });

		const cgpa = Number(min_cgpa);
		if (isNaN(cgpa) || cgpa < 0 || cgpa > 10)
			return res.status(400).json({ status: false, msg: "min_cgpa must be a number between 0 and 10 !!" });

		const company = await CampusRecruiter.findById(company_id).lean();
		if (!company)
			return res.status(404).json({ status: false, msg: "Company / recruiter not found !!" });

		const job = await CampusJob.create({
			company_id,
			role_category: String(role_category).trim(),
			position_title: String(position_title).trim(),
			package_range: String(package_range).trim(),
			openings_count: openings,
			location: String(location).trim(),
			min_cgpa: cgpa,
			eligible_degrees: eligible_degrees.map((degree) => String(degree).trim()).filter(Boolean),
			mandatory_skills: mandatory_skills.map((skill) => String(skill).trim()).filter(Boolean),
		});

		return res.status(201).json({ status: true, msg: "Campus job published successfully !!", data: job });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while publishing the job !!" });
	}
};

campusJobController.getJobs = async (req, res) => {
	try {
		const { role_category, degree, min_cgpa } = req.query;
		const page = Number(req.query.page) >= 1 ? Number(req.query.page) : 1;
		const limit = Number(req.query.limit) >= 1 ? Number(req.query.limit) : 10;

		const filters = { status: "Published" };

		if (role_category && String(role_category).trim())
			filters.role_category = { $regex: escapeRegex(String(role_category).trim()), $options: "i" };

		if (degree && String(degree).trim())
			filters.eligible_degrees = { $regex: escapeRegex(String(degree).trim()), $options: "i" };

		if (min_cgpa !== undefined && min_cgpa !== "") {
			const cgpa = Number(min_cgpa);
			if (isNaN(cgpa) || cgpa < 0 || cgpa > 10)
				return res.status(400).json({ status: false, msg: "min_cgpa filter must be a number between 0 and 10 !!" });
			filters.min_cgpa = { $lte: cgpa };
		}

		const skip = limit * (page - 1);

		const jobs = await CampusJob.find(filters)
			.populate("company_id", "company_name verification_status location")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();
		const jobCount = await CampusJob.countDocuments(filters);

		return res.status(200).json({
			status: true,
			msg: "Campus jobs fetched successfully !!",
			jobCount,
			pageCount: parseInt(Math.ceil(jobCount / limit)),
			currentPage: page,
			jobs,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while fetching campus jobs !!" });
	}
};

campusJobController.nominateStudents = async (req, res) => {
	try {
		const { job_id } = req.params;
		const { student_ids } = req.body;

		if (!job_id || !mongoose.Types.ObjectId.isValid(job_id))
			return res.status(400).json({ status: false, msg: "Invalid job_id !!" });

		if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0)
			return res.status(400).json({ status: false, msg: "student_ids must be a non-empty array !!" });

		const invalidIds = student_ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
		if (invalidIds.length)
			return res.status(400).json({ status: false, msg: "Invalid student_ids found in the payload !!", data: { invalidIds } });

		const uniqueIds = [...new Set(student_ids.map((id) => String(id)))];

		const job = await CampusJob.findById(job_id).lean();
		if (!job)
			return res.status(404).json({ status: false, msg: "Job not found !!" });

		const students = await CampusStudent.find({ _id: { $in: uniqueIds } }).select("_id").lean();
		if (students.length !== uniqueIds.length) {
			const foundIds = new Set(students.map((student) => String(student._id)));
			const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
			return res.status(400).json({ status: false, msg: "Some student_ids do not exist !!", data: { missingIds } });
		}

		const updatedJob = await CampusJob.findByIdAndUpdate(
			job_id,
			{ $addToSet: { nominated_students: { $each: uniqueIds } } },
			{ new: true }
		)
			.populate("nominated_students", "name email rollNumber degree branch cgpa")
			.lean();

		return res.status(200).json({
			status: true,
			msg: "Students nominated successfully !!",
			data: { job: updatedJob, nominatedCount: updatedJob.nominated_students.length },
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while nominating students !!" });
	}
};

module.exports = campusJobController;
