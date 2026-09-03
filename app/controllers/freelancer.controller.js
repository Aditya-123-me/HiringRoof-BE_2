const Freelancer = require("../models/freelancer.model");
const AdminUser = require("../models/adminUser.model");
const sendMail = require("../util/sendMail.js");
const { getApprovalMailTemplate } = require("../util/ApprovalMailTemplate");
const { getRejectionMailTemplate } = require("../util/RejectionMailTemplate");

const freelancerController = {};

// Freelancer applies for registration
freelancerController.apply = async (req, res) => {
	try {
		const { name, email, phone, experience, resume, portfolioLink, about, preferredPassword } = req.body;

		if (!name || !email || !phone) {
			return res.status(400).send({ status: false, msg: "Name, email, and phone are required!" });
		}

		// Check if application already exists
		const existingFreelancer = await Freelancer.findOne({ email });
		if (existingFreelancer) {
			return res.status(400).send({ status: false, msg: "An application with this email already exists." });
		}

		// Check if an admin/HR account already exists with this email
		const existingAdmin = await AdminUser.findOne({ email });
		if (existingAdmin) {
			return res.status(400).send({ status: false, msg: "An HR/Admin account with this email already exists." });
		}

		const newApplication = new Freelancer({
			name,
			email,
			phone,
			experience,
			resume,
			portfolioLink,
			about,
			preferredPassword,
			status: "pending",
		});

		const savedApplication = await newApplication.save();

		return res.status(201).send({
			status: true,
			msg: "Your application has been submitted successfully and is pending approval.",
			data: savedApplication,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

// Fetch applications (supports filtering by status, email, phone)
freelancerController.getAllApplications = async (req, res) => {
	try {
		const { status, email, phone } = req.query;
		const filter = {};

		if (status) filter.status = status;
		if (email) filter.email = email.trim();
		if (phone) filter.phone = phone.trim();

		const applications = await Freelancer.find(filter).sort({ createdAt: -1 });
		return res.status(200).send({
			status: true,
			msg: "Applications fetched successfully.",
			data: applications,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

// Super Admin approves the application
freelancerController.approve = async (req, res) => {
	try {
		const { applicationId } = req.params;
		const { password, badge } = req.body; // Super admin might set an initial password and select a badge

		if (!password) {
			return res.status(400).send({ status: false, msg: "Please provide an initial password for the HR admin account." });
		}

		const application = await Freelancer.findById(applicationId);
		if (!application) {
			return res.status(404).send({ status: false, msg: "Application not found." });
		}

		if (application.status === "approved") {
			return res.status(400).send({ status: false, msg: "Application is already approved." });
		}

		// Generate unique userId like in adminUser.controller.js
		const adminUserCount = await AdminUser.countDocuments();
		const generatedUserId = `${application.name.split(" ")[0]}_${adminUserCount}`;

		const newAdminUser = new AdminUser({
			name: application.name,
			email: application.email,
			number: application.phone,
			password: password, // adminUser schema uses plaintext passwords in this system
			type: "hr", // They are registered as an HR admin
			isActive: true,
			userId: generatedUserId,
			referralCode: generatedUserId,
			isFreelancer: true,
			badge: badge || "Freelance Partner",
		});

		const savedAdminUser = await newAdminUser.save();

		// Update the application status
		application.status = "approved";
		application.adminUserId = savedAdminUser._id;
		if (badge) application.badge = badge;
		// application.approvedBy = req.user._id; // Assuming super admin user id is in req.user
		application.approvalDate = new Date();

		const updatedApplication = await application.save();

		// Send email notification with credentials
		const emailHtml = getApprovalMailTemplate(
			updatedApplication.name, 
			updatedApplication.email, 
			password, 
			updatedApplication.badge || "Freelance Partner"
		);
		await sendMail(updatedApplication.email, "Welcome to HiringRoof! Your HR Account is Ready", emailHtml);

		return res.status(200).send({
			status: true,
			msg: "Freelancer application approved and HR account created successfully.",
			data: { application: updatedApplication, hrAccount: savedAdminUser },
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

// Super Admin rejects the application
freelancerController.reject = async (req, res) => {
	try {
		const { applicationId } = req.params;
		const { reason } = req.body;

		const application = await Freelancer.findById(applicationId);
		if (!application) {
			return res.status(404).send({ status: false, msg: "Application not found." });
		}

		application.status = "rejected";
		if (reason) application.rejectedReason = reason;

		const updatedApplication = await application.save();

		// Send rejection email notification
		const emailHtml = getRejectionMailTemplate(updatedApplication.name, reason);
		await sendMail(updatedApplication.email, "Update on your HiringRoof Application", emailHtml);

		return res.status(200).send({
			status: true,
			msg: "Freelancer application has been rejected.",
			data: updatedApplication,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

module.exports = freelancerController;
