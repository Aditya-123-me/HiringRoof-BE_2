const recruiterDetailsRequestModel = require("../models/recruiterDetailsRequest.model");
const { imageUpload } = require("../util/googleDrive.util");
const userModel = require("../models/user.model");

const controller = {};

// Submit unlock request
controller.submitRequest = async (req, res) => {
	try {
		const { recruiterId, amount } = req.body;
		if (!recruiterId) return res.status(400).json({ status: false, msg: "recruiterId is required!" });
		if (!amount) return res.status(400).json({ status: false, msg: "amount is required!" });
		if (!req.file) return res.status(400).json({ status: false, msg: "Please upload payment screenshot proof!" });

		const screenshotUrl = await imageUpload(req.file, `${req.user._id}_recruiter_unlock_${Date.now()}`, "paymentProof");
		if (!screenshotUrl) return res.status(500).json({ status: false, msg: "Failed to upload screenshot proof!" });

		const newRequest = await recruiterDetailsRequestModel.create({
			hrId: req.user._id,
			recruiterId,
			amount: Number(amount),
			paymentScreenshot: screenshotUrl,
			status: "PENDING"
		});

		return res.status(200).json({
			status: true,
			msg: "Unlock request submitted successfully! Pending verification by Super Admin.",
			data: newRequest
		});
	} catch (error) {
		console.error("Error in submitRequest:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get requests submitted by the logged in HR
controller.myRequests = async (req, res) => {
	try {
		const requests = await recruiterDetailsRequestModel.find({ hrId: req.user._id })
			.populate("recruiterId", "name email phone companyName profileImage companyLogo location")
			.sort({ createdAt: -1 });

		return res.status(200).json({ status: true, data: requests });
	} catch (error) {
		console.error("Error in myRequests:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Check status for a specific recruiter
controller.status = async (req, res) => {
	try {
		const { recruiterId } = req.params;
		const request = await recruiterDetailsRequestModel.findOne({ hrId: req.user._id, recruiterId })
			.sort({ createdAt: -1 });

		return res.status(200).json({
			status: true,
			data: request || null
		});
	} catch (error) {
		console.error("Error in status:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Super Admin: List all requests
controller.allRequests = async (req, res) => {
	try {
		const { status } = req.query;
		const query = status && status !== "ALL" ? { status } : {};

		const requests = await recruiterDetailsRequestModel.find(query)
			.populate("hrId", "name email number profileImage")
			.populate("recruiterId", "name email phone companyName profileImage companyLogo location")
			.sort({ createdAt: -1 });

		return res.status(200).json({ status: true, data: requests });
	} catch (error) {
		console.error("Error in allRequests:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Super Admin: Verify (Approve/Reject) request
controller.verifyRequest = async (req, res) => {
	try {
		const { id } = req.params;
		const { action, rejectionReason } = req.body; // action: "APPROVE" or "REJECT"

		const request = await recruiterDetailsRequestModel.findById(id);
		if (!request) return res.status(404).json({ status: false, msg: "Request not found!" });

		if (action === "APPROVE") {
			request.status = "APPROVED";
		} else if (action === "REJECT") {
			request.status = "REJECTED";
			request.rejectionReason = rejectionReason || "Verification failed";
		} else {
			return res.status(400).json({ status: false, msg: "Invalid action!" });
		}

		await request.save();

		return res.status(200).json({
			status: true,
			msg: `Request ${action === "APPROVE" ? "approved" : "rejected"} successfully!`,
			data: request
		});
	} catch (error) {
		console.error("Error in verifyRequest:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = controller;
