const XLSX = require("xlsx");
const moment = require("moment");
const mongoose = require("mongoose");
const CampusStudent = require("../models/campusStudent.model");
const CampusInterview = require("../models/campusInterview.model");

const campusController = {};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const HEADER_ALIASES = {
	name: ["name", "studentname", "fullname", "student"],
	email: ["email", "emailid", "mail", "emailaddress"],
	phone: ["phone", "phonenumber", "mobile", "mobileno", "contact", "contactno"],
	rollNumber: ["rollnumber", "rollno", "roll", "studentid", "registrationno", "enrollmentno"],
	degree: ["degree", "qualification", "course"],
	branch: ["branch", "stream", "department"],
	passoutYear: ["passoutyear", "batch", "graduationyear", "yearofpassing", "passingyear"],
	cgpa: ["cgpa", "percentage", "marks", "score"],
	gender: ["gender", "sex"],
	dob: ["dob", "dateofbirth", "birthdate"],
	location: ["location", "city", "address"],
	skills: ["skills", "skill", "keyskills"],
	resume: ["resume", "resumelink", "resumepath"],
};

const normalizeHeader = (header) => String(header || "")
	.toLowerCase()
	.replace(/[^a-z0-9]/g, "");

const formatCell = (value) => {
	if (value === null || value === undefined) return "";
	if (value instanceof Date && !isNaN(value)) return moment(value).format("YYYY-MM-DD");
	if (typeof value === "number") {
		if (value > 20000 && value < 60000) {
			const parsed = XLSX.SSF.parse_date_code(value);
			if (parsed) return moment([parsed.y, parsed.m - 1, parsed.d]).format("YYYY-MM-DD");
		}
		if (Number.isInteger(value)) return String(value);
		return String(value);
	}
	return String(value).trim();
};

const normalizeRow = (row) => {
	const normalizedHeaderRow = {};
	Object.keys(row).forEach((key) => {
		normalizedHeaderRow[normalizeHeader(key)] = row[key];
	});

	const pick = (aliases) => {
		for (const alias of aliases) {
			const value = normalizedHeaderRow[alias];
			if (value !== undefined && value !== null && String(value).trim() !== "") return value;
		}
		return "";
	};

	const skills = pick(HEADER_ALIASES.skills);

	return {
		name: formatCell(pick(HEADER_ALIASES.name)),
		email: formatCell(pick(HEADER_ALIASES.email)).toLowerCase(),
		phone: formatCell(pick(HEADER_ALIASES.phone)).replace(/[^0-9+]/g, ""),
		rollNumber: formatCell(pick(HEADER_ALIASES.rollNumber)),
		degree: formatCell(pick(HEADER_ALIASES.degree)),
		branch: formatCell(pick(HEADER_ALIASES.branch)),
		passoutYear: formatCell(pick(HEADER_ALIASES.passoutYear)),
		cgpa: formatCell(pick(HEADER_ALIASES.cgpa)),
		gender: formatCell(pick(HEADER_ALIASES.gender)),
		dob: formatCell(pick(HEADER_ALIASES.dob)),
		location: formatCell(pick(HEADER_ALIASES.location)),
		resume: formatCell(pick(HEADER_ALIASES.resume)),
		skills: skills
			? String(skills)
					.split(",")
					.map((skill) => skill.trim())
					.filter(Boolean)
			: [],
	};
};

campusController.studentsBulkUpload = async (req, res) => {
	try {
		const { collegeId } = req.body;

		if (!req.file || !req.file.buffer || !req.file.buffer.length)
			return res.status(400).json({ status: false, msg: "No file attached, please upload an Excel or CSV file !!" });

		if (!collegeId) return res.status(400).json({ status: false, msg: "collegeId is required !!" });

		if (!mongoose.Types.ObjectId.isValid(collegeId))
			return res.status(400).json({ status: false, msg: "Invalid collegeId !!" });

		let workbook;
		try {
			workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
		} catch (error) {
			return res.status(400).json({ status: false, msg: "Unable to parse the uploaded file, please upload a valid Excel or CSV file !!" });
		}

		const sheetName = workbook.SheetNames[0];
		if (!sheetName) return res.status(400).json({ status: false, msg: "Uploaded file is empty !!" });

		const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
		if (!rows.length) return res.status(400).json({ status: false, msg: "Uploaded sheet has no data rows !!" });

		const validRows = [];
		const invalidRows = [];
		const fileKeys = new Set();

		rows.forEach((row, index) => {
			const rowNumber = index + 2;
			const student = normalizeRow(row);

			if (!student.name) {
				invalidRows.push({ row: rowNumber, reason: "name is required" });
				return;
			}
			if (!student.email && !student.phone) {
				invalidRows.push({ row: rowNumber, reason: "email or phone is required" });
				return;
			}

			const key = student.phone ? `p_${student.phone}` : `e_${student.email}`;
			if (fileKeys.has(key)) {
				invalidRows.push({ row: rowNumber, reason: "duplicate row inside uploaded file" });
				return;
			}
			fileKeys.add(key);

			student.collegeId = collegeId;
			validRows.push(student);
		});

		if (!validRows.length)
			return res.status(400).json({
				status: false,
				msg: "No valid student rows found in the uploaded file !!",
				data: { totalRows: rows.length, insertedCount: 0, duplicateCount: 0, failedRows: invalidRows },
			});

		const emails = validRows.map((row) => row.email).filter(Boolean);
		const phones = validRows.map((row) => row.phone).filter(Boolean);
		const orConditions = [];
		if (emails.length) orConditions.push({ email: { $in: emails } });
		if (phones.length) orConditions.push({ phone: { $in: phones } });

		const existingStudents = orConditions.length
			? await CampusStudent.find({ collegeId, $or: orConditions }).select("email phone").lean()
			: [];

		const existingKeys = new Set();
		existingStudents.forEach((student) => {
			if (student.email) existingKeys.add(`e_${student.email}`);
			if (student.phone) existingKeys.add(`p_${student.phone}`);
		});

		const duplicateCount = validRows.filter((row) => existingKeys.has(row.phone ? `p_${row.phone}` : `e_${row.email}`)).length;
		const rowsToInsert = validRows.filter((row) => !existingKeys.has(row.phone ? `p_${row.phone}` : `e_${row.email}`));

		if (!rowsToInsert.length)
			return res.status(400).json({
				status: false,
				msg: "All student rows already exist for this college !!",
				data: { totalRows: rows.length, insertedCount: 0, duplicateCount, failedRows: invalidRows },
			});

		const result = await CampusStudent.insertMany(rowsToInsert, { ordered: false, rawResult: true });

		return res.status(201).json({
			status: true,
			msg: "Students uploaded successfully !!",
			data: {
				collegeId,
				totalRows: rows.length,
				insertedCount: result.insertedCount,
				duplicateCount,
				failedCount: invalidRows.length,
				failedRows: invalidRows,
			},
		});
	} catch (error) {
		console.log(error);

		if (error.name === "MongoBulkWriteError" && error.insertedCount > 0)
			return res.status(201).json({
				status: true,
				msg: "Students uploaded successfully !!",
				data: {
					collegeId: req.body.collegeId,
					insertedCount: error.insertedCount,
					failedCount: error.writeErrors ? error.writeErrors.length : 0,
					failedRows: error.writeErrors ? error.writeErrors.map((writeError) => ({ row: writeError.index + 2, reason: writeError.errmsg })) : [],
				},
			});

		if (error.code === 11000)
			return res.status(400).json({ status: false, msg: "Duplicate student record found, please check the uploaded file !!" });

		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while uploading students !!" });
	}
};

campusController.getStudents = async (req, res) => {
	try {
		const { college, course, batch_year, skill_keyword, location, status, search } = req.query;
		const page = Number(req.query.page) >= 1 ? Number(req.query.page) : 1;
		const limit = Number(req.query.limit) >= 1 ? Number(req.query.limit) : 10;

		const filters = {};

		if (college && String(college).trim()) {
			if (!mongoose.Types.ObjectId.isValid(college))
				return res.status(400).json({ status: false, msg: "Invalid college filter !!" });
			filters.collegeId = college;
		}

		if (course && String(course).trim())
			filters.degree = { $regex: escapeRegex(String(course).trim()), $options: "i" };

		if (batch_year && String(batch_year).trim())
			filters.passoutYear = String(batch_year).trim();

		if (skill_keyword && String(skill_keyword).trim())
			filters.skills = { $regex: escapeRegex(String(skill_keyword).trim()), $options: "i" };

		if (location && String(location).trim())
			filters.location = { $regex: escapeRegex(String(location).trim()), $options: "i" };

		if (status && String(status).trim()) {
			const statusFilter = String(status).trim().toLowerCase();
			if (statusFilter !== "placed" && statusFilter !== "unplaced")
				return res.status(400).json({ status: false, msg: "status filter must be either 'placed' or 'unplaced' !!" });

			const placedStudentIds = await CampusInterview.distinct("candidate_id", { status: "Offer Extended" });
			filters._id = statusFilter === "placed" ? { $in: placedStudentIds } : { $nin: placedStudentIds };
		}

		if (search && String(search).trim()) {
			const keyword = escapeRegex(String(search).trim());
			filters.$or = [
				{ name: { $regex: keyword, $options: "i" } },
				{ email: { $regex: keyword, $options: "i" } },
				{ rollNumber: { $regex: keyword, $options: "i" } },
			];
		}

		const skip = limit * (page - 1);

		const students = await CampusStudent.find(filters)
			.populate("collegeId", "college_name city state")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();
		const studentCount = await CampusStudent.countDocuments(filters);

		return res.status(200).json({
			status: true,
			msg: "Students fetched successfully !!",
			studentCount,
			pageCount: parseInt(Math.ceil(studentCount / limit)),
			currentPage: page,
			students,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while fetching students !!" });
	}
};

module.exports = campusController;
