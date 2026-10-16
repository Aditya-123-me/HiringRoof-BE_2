const mongoose = require("mongoose");
const CampusRecruiter = require("../models/campusRecruiter.model");
const CampusDrive = require("../models/campusDrive.model");
const sendEmail = require("../util/email.util");

const campusRecruiterController = {};

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const VERIFICATION_STATUSES = ["Pending", "Verified", "Rejected"];

campusRecruiterController.registerRecruiter = async (req, res) => {
	try {
		const { recruiter_id, company_name, verification_status, domain, location, contact_name, contact_email, contact_phone, company_website } = req.body;

		if (!recruiter_id || String(recruiter_id).trim() === "")
			return res.status(400).json({ status: false, msg: "recruiter_id is required !!" });

		if (!company_name || String(company_name).trim() === "")
			return res.status(400).json({ status: false, msg: "company_name is required !!" });

		if (verification_status !== undefined && verification_status !== "" && !VERIFICATION_STATUSES.includes(verification_status))
			return res.status(400).json({ status: false, msg: `verification_status must be one of ${VERIFICATION_STATUSES.join(", ")} !!` });

		if (contact_email && !EMAIL_REGEX.test(String(contact_email).trim()))
			return res.status(400).json({ status: false, msg: "Please provide a valid contact_email !!" });

		const existingRecruiter = await CampusRecruiter.findOne({ recruiter_id: String(recruiter_id).trim() }).lean();
		if (existingRecruiter)
			return res.status(400).json({ status: false, msg: "Recruiter with this recruiter_id already exists !!" });

		const recruiter = await CampusRecruiter.create({
			recruiter_id: String(recruiter_id).trim(),
			company_name: String(company_name).trim(),
			verification_status: verification_status || "Pending",
			domain: domain ? String(domain).trim() : "",
			location: location ? String(location).trim() : "",
			contact_name: contact_name ? String(contact_name).trim() : "",
			contact_email: contact_email ? String(contact_email).trim().toLowerCase() : "",
			contact_phone: contact_phone ? String(contact_phone).trim() : "",
			company_website: company_website ? String(company_website).trim() : "",
		});

		return res.status(201).json({ status: true, msg: "Corporate recruiter registered successfully !!", data: recruiter });
	} catch (error) {
		console.log(error);

		if (error.code === 11000)
			return res.status(400).json({ status: false, msg: "Recruiter with this recruiter_id already exists !!" });

		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while registering recruiter !!" });
	}
};

campusRecruiterController.getRecruiters = async (req, res) => {
	try {
		const { domain, location } = req.query;
		const page = Number(req.query.page) >= 1 ? Number(req.query.page) : 1;
		const limit = Number(req.query.limit) >= 1 ? Number(req.query.limit) : 10;

		const filters = {};

		if (domain && String(domain).trim())
			filters.domain = { $regex: escapeRegex(String(domain).trim()), $options: "i" };

		if (location && String(location).trim())
			filters.location = { $regex: escapeRegex(String(location).trim()), $options: "i" };

		const skip = limit * (page - 1);

		const recruiters = await CampusRecruiter.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
		const recruiterCount = await CampusRecruiter.countDocuments(filters);

		return res.status(200).json({
			status: true,
			msg: "Recruiters fetched successfully !!",
			recruiterCount,
			pageCount: parseInt(Math.ceil(recruiterCount / limit)),
			currentPage: page,
			recruiters,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while fetching recruiters !!" });
	}
};

campusRecruiterController.inviteRecruiter = async (req, res) => {
	try {
		const { recruiter_id } = req.params;
		const { drive_id, message } = req.body;

		if (!recruiter_id || String(recruiter_id).trim() === "")
			return res.status(400).json({ status: false, msg: "recruiter_id is required !!" });

		if (!drive_id) return res.status(400).json({ status: false, msg: "drive_id is required !!" });

		if (!mongoose.Types.ObjectId.isValid(drive_id))
			return res.status(400).json({ status: false, msg: "Invalid drive_id !!" });

		const recruiter = await CampusRecruiter.findOne({ recruiter_id: String(recruiter_id).trim() }).lean();
		if (!recruiter)
			return res.status(404).json({ status: false, msg: "Recruiter not found !!" });

		if (!recruiter.contact_email)
			return res.status(400).json({ status: false, msg: "Recruiter does not have a contact email to send the invitation !!" });

		const drive = await CampusDrive.findById(drive_id).populate("host_college_id", "college_name city state").lean();
		if (!drive)
			return res.status(404).json({ status: false, msg: "Drive not found !!" });

		const collegeName = drive.host_college_id ? drive.host_college_id.college_name : "Partner College";
		const driveDate = new Date(drive.drive_date).toDateString();
		const invitationMessage = message && String(message).trim() !== "" ? String(message).trim() : `We would like to invite ${recruiter.company_name} to participate in the ${drive.drive_title} placement drive.`;

		const html = `
			<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333;">
				<h2 style="color: #1a73e8;">Hiring Roof - Campus Drive Invitation</h2>
				<p>Dear ${recruiter.contact_name || recruiter.company_name},</p>
				<p>${invitationMessage}</p>
				<table style="border-collapse: collapse; margin: 16px 0;">
					<tr><td style="padding: 6px 12px; border: 1px solid #dddddd;"><strong>Drive</strong></td><td style="padding: 6px 12px; border: 1px solid #dddddd;">${drive.drive_title}</td></tr>
					<tr><td style="padding: 6px 12px; border: 1px solid #dddddd;"><strong>College</strong></td><td style="padding: 6px 12px; border: 1px solid #dddddd;">${collegeName}</td></tr>
					<tr><td style="padding: 6px 12px; border: 1px solid #dddddd;"><strong>Date</strong></td><td style="padding: 6px 12px; border: 1px solid #dddddd;">${driveDate}</td></tr>
					<tr><td style="padding: 6px 12px; border: 1px solid #dddddd;"><strong>Type</strong></td><td style="padding: 6px 12px; border: 1px solid #dddddd;">${drive.drive_type}</td></tr>
					<tr><td style="padding: 6px 12px; border: 1px solid #dddddd;"><strong>Package</strong></td><td style="padding: 6px 12px; border: 1px solid #dddddd;">${drive.package_range}</td></tr>
				</table>
				<p>Regards,<br />Team Hiring Roof</p>
			</div>`;

		await sendEmail({
			to: recruiter.contact_email,
			subject: `Invitation: ${drive.drive_title} Campus Drive`,
			html,
		});

		return res.status(200).json({
			status: true,
			msg: "Invitation sent to recruiter successfully !!",
			data: { recruiter_id: recruiter.recruiter_id, drive_id: drive._id, invited_email: recruiter.contact_email },
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message || "Something went wrong while sending the recruiter invitation !!" });
	}
};

module.exports = campusRecruiterController;
