const mongoose = require("mongoose");
const CampusDrive = require("../models/campusDrive.model");
const CampusRecruiter = require("../models/campusRecruiter.model");
const College = require("../models/college.model");

const campusDriveController = {};

const DRIVE_TYPES = ["On Campus", "Off Campus", "Virtual", "Pool Drive"];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

campusDriveController.createDrive = async (req, res) => {
	try {
		const { drive_title, recruiting_company_id, host_college_id, drive_type, drive_date, package_range, selection_rounds } = req.body;

		const requiredFields = { drive_title, recruiting_company_id, host_college_id, drive_type, drive_date, package_range, selection_rounds };

		for (const field of Object.keys(requiredFields)) {
			const value = requiredFields[field];
			const isEmpty = value === undefined || value === null || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.filter(Boolean).length === 0);
			if (isEmpty) return res.status(400).json({ status: false, msg: `${field} is required !!` });
		}

		if (!mongoose.Types.ObjectId.isValid(recruiting_company_id))
			return res.status(400).json({ status: false, msg: "Invalid recruiting_company_id !!" });

		if (!mongoose.Types.ObjectId.isValid(host_college_id))
			return res.status(400).json({ status: false, msg: "Invalid host_college_id !!" });

		if (!DRIVE_TYPES.includes(drive_type))
			return res.status(400).json({ status: false, msg: `drive_type must be one of ${DRIVE_TYPES.join(", ")} !!` });

		if (isNaN(new Date(drive_date).getTime()))
			return res.status(400).json({ status: false, msg: "drive_date must be a valid date !!" });

		if (!Array.isArray(selection_rounds))
			return res.status(400).json({ status: false, msg: "selection_rounds must be an array !!" });

		const company = await CampusRecruiter.findById(recruiting_company_id).lean();
		if (!company)
			return res.status(404).json({ status: false, msg: "Recruiting company not found !!" });

		const college = await College.findById(host_college_id).lean();
		if (!college)
			return res.status(404).json({ status: false, msg: "Host college not found !!" });

		const drive = await CampusDrive.create({
			drive_title: String(drive_title).trim(),
			recruiting_company_id,
			host_college_id,
			drive_type,
			drive_date: new Date(drive_date),
			package_range: String(package_range).trim(),
			selection_rounds: selection_rounds.map((round) => String(round).trim()).filter(Boolean),
		});

		return res.status(201).json({ status: true, msg: "Placement drive scheduled successfully !!", data: drive });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while scheduling the drive !!" });
	}
};

campusDriveController.getDrives = async (req, res) => {
	try {
		const { type, status, college_id } = req.query;
		const page = Number(req.query.page) >= 1 ? Number(req.query.page) : 1;
		const limit = Number(req.query.limit) >= 1 ? Number(req.query.limit) : 10;

		const filters = {};

		if (type && String(type).trim())
			filters.drive_type = { $regex: `^${escapeRegex(String(type).trim())}$`, $options: "i" };

		if (status && String(status).trim())
			filters.status = { $regex: `^${escapeRegex(String(status).trim())}$`, $options: "i" };

		if (college_id && String(college_id).trim()) {
			if (!mongoose.Types.ObjectId.isValid(college_id))
				return res.status(400).json({ status: false, msg: "Invalid college_id filter !!" });
			filters.host_college_id = college_id;
		}

		const skip = limit * (page - 1);

		const drives = await CampusDrive.find(filters)
			.populate("recruiting_company_id", "company_name verification_status")
			.populate("host_college_id", "college_name city state")
			.sort({ drive_date: -1 })
			.skip(skip)
			.limit(limit)
			.lean();
		const driveCount = await CampusDrive.countDocuments(filters);

		return res.status(200).json({
			status: true,
			msg: "Placement drives fetched successfully !!",
			driveCount,
			pageCount: parseInt(Math.ceil(driveCount / limit)),
			currentPage: page,
			drives,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while fetching drives !!" });
	}
};

module.exports = campusDriveController;
