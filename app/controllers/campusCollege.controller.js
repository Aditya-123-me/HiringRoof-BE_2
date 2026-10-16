const mongoose = require("mongoose");
const College = require("../models/college.model");
const CampusDrive = require("../models/campusDrive.model");
const CampusStudent = require("../models/campusStudent.model");

const campusCollegeController = {};

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

campusCollegeController.registerCollege = async (req, res) => {
	try {
		const { college_name, affiliated_university, college_code, state, city, nirf_rank, accreditation, tpo_name, tpo_email, tpo_phone, college_website } = req.body;

		const requiredFields = { college_name, affiliated_university, college_code, state, city, tpo_name, tpo_email, tpo_phone };

		for (const field of Object.keys(requiredFields)) {
			if (!requiredFields[field] || String(requiredFields[field]).trim() === "")
				return res.status(400).json({ status: false, msg: `${field} is required !!` });
		}

		if (!EMAIL_REGEX.test(String(tpo_email).trim()))
			return res.status(400).json({ status: false, msg: "Please provide a valid tpo_email !!" });

		let rank = null;
		if (nirf_rank !== undefined && nirf_rank !== null && String(nirf_rank).trim() !== "") {
			rank = Number(nirf_rank);
			if (isNaN(rank) || rank < 1)
				return res.status(400).json({ status: false, msg: "nirf_rank must be a positive number !!" });
		}

		const existingCollege = await College.findOne({ college_code: String(college_code).trim() }).lean();
		if (existingCollege)
			return res.status(400).json({ status: false, msg: "College with this college_code already exists !!" });

		const college = await College.create({
			college_name: String(college_name).trim(),
			affiliated_university: String(affiliated_university).trim(),
			college_code: String(college_code).trim(),
			state: String(state).trim(),
			city: String(city).trim(),
			nirf_rank: rank,
			accreditation: accreditation ? String(accreditation).trim() : "",
			tpo_name: String(tpo_name).trim(),
			tpo_email: String(tpo_email).trim().toLowerCase(),
			tpo_phone: String(tpo_phone).trim(),
			college_website: college_website ? String(college_website).trim() : "",
		});

		return res.status(201).json({ status: true, msg: "College registered successfully !!", data: college });
	} catch (error) {
		console.log(error);

		if (error.code === 11000)
			return res.status(400).json({ status: false, msg: "College with this college_code already exists !!" });

		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while registering college !!" });
	}
};

campusCollegeController.getColleges = async (req, res) => {
	try {
		const { state, nirf_rank, search } = req.query;
		const page = Number(req.query.page) >= 1 ? Number(req.query.page) : 1;
		const limit = Number(req.query.limit) >= 1 ? Number(req.query.limit) : 10;

		const filters = {};

		if (state && String(state).trim())
			filters.state = { $regex: escapeRegex(String(state).trim()), $options: "i" };

		if (nirf_rank !== undefined && nirf_rank !== "") {
			const rank = Number(nirf_rank);
			if (isNaN(rank) || rank < 1)
				return res.status(400).json({ status: false, msg: "nirf_rank filter must be a positive number !!" });
			filters.nirf_rank = { $lte: rank };
		}

		if (search && String(search).trim()) {
			const keyword = escapeRegex(String(search).trim());
			filters.$or = [
				{ college_name: { $regex: keyword, $options: "i" } },
				{ college_code: { $regex: keyword, $options: "i" } },
				{ affiliated_university: { $regex: keyword, $options: "i" } },
				{ city: { $regex: keyword, $options: "i" } },
			];
		}

		const skip = limit * (page - 1);

		const colleges = await College.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
		const collegeCount = await College.countDocuments(filters);

		return res.status(200).json({
			status: true,
			msg: "Colleges fetched successfully !!",
			collegeCount,
			pageCount: parseInt(Math.ceil(collegeCount / limit)),
			currentPage: page,
			colleges,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while fetching colleges !!" });
	}
};

campusCollegeController.getCollegePortal = async (req, res) => {
	try {
		const { college_id } = req.params;

		if (!college_id || !mongoose.Types.ObjectId.isValid(college_id))
			return res.status(400).json({ status: false, msg: "Invalid college_id !!" });

		const college = await College.findById(college_id).lean();
		if (!college)
			return res.status(404).json({ status: false, msg: "College not found !!" });

		const driveHistory = await CampusDrive.find({ host_college_id: college_id })
			.populate("recruiting_company_id", "company_name verification_status")
			.sort({ drive_date: -1 })
			.lean();

		const studentCount = await CampusStudent.countDocuments({ collegeId: college_id });

		return res.status(200).json({
			status: true,
			msg: "College portal data fetched successfully !!",
			data: { college, driveHistory, studentCount },
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while fetching college portal !!" });
	}
};

module.exports = campusCollegeController;
