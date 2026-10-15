const jobController = require("../controllers/job.controller");
const userController = require("../controllers/user.controller");
const superAdmin = require("../controllers/superAdmin.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");
const upload = require("../middleware/multer.middleware");

module.exports = (router, io) => {
	router.post("/superAdmin/login", superAdmin.adminLogin);
	router.get("/superAdmin/get-all-feedback", adminAuthorization, superAdmin.getFeedbackDescending);
	router.get("/superAdmin/get-interviews-history", adminAuthorization, superAdmin.getInterviewsHistory);
	router.get("/superAdmin/getJobTargetsSuperAdmin", adminAuthorization, superAdmin.getJobTargetsSuperAdmin);
	router.get("/superAdmin/getStatistics", adminAuthorization, superAdmin.getStatistics);
	router.get("/superAdmin/manual-payments", adminAuthorization, superAdmin.getManualPayments);
	router.get("/superAdmin/get-pending-addon-jobs", adminAuthorization, superAdmin.getPendingAddonJobs);
	router.put("/superAdmin/verify-manual-payment/:id", adminAuthorization, superAdmin.verifyManualPayment);

	// Badge & Status APIs
	router.post("/superAdmin/toggle-badge", adminAuthorization, superAdmin.toggleCandidateBadge);
	router.put("/superAdmin/set-candidate-status", adminAuthorization, superAdmin.setCandidateStatus);
	router.get("/superAdmin/candidates-by-status", adminAuthorization, superAdmin.getCandidatesByStatus);
	router.put("/superAdmin/candidate-selection", adminAuthorization, superAdmin.updateCandidateSelection);
	router.put("/superAdmin/job/edit/:jobId", adminAuthorization, jobController.editJobPost);
	router.get("/superAdmin/service-orders", adminAuthorization, superAdmin.getServiceOrders);
	router.put("/superAdmin/assign-service-hr", adminAuthorization, (req, res) => superAdmin.assignServiceHR(req, res, io));
		// Super Admin All Conversations & Chat Audit APIs
	router.get("/superAdmin/all-conversations", adminAuthorization, superAdmin.getAllConversations);
	router.get("/superAdmin/conversation-messages/:roomId", adminAuthorization, superAdmin.getConversationMessages);
	router.get("/superAdmin/pending-immediate-tags", adminAuthorization, superAdmin.getPendingImmediateTags);
	router.put("/superAdmin/approve-immediate-tag/:jobId", adminAuthorization, superAdmin.approveImmediateTag);
	router.put("/superAdmin/reject-immediate-tag/:jobId", adminAuthorization, superAdmin.rejectImmediateTag);

	// Super Admin Complete Analytics API
	router.get("/superAdmin/getCompleteAnalytics", adminAuthorization, superAdmin.getCompleteAnalytics);
	router.get("/superAdmin/complete-analytics", adminAuthorization, superAdmin.getCompleteAnalytics);

	// Super Admin Candidate Analytics API (Supports Bar Graph Timeline & Pie Chart Stage Percentage)
	router.post("/superAdmin/getCandidateAnalytics", adminAuthorization, superAdmin.getCandidateAnalytics);
	router.get("/superAdmin/getCandidateAnalytics", adminAuthorization, superAdmin.getCandidateAnalytics);
	router.get("/superAdmin/getCandidateAnalytics/:userId", adminAuthorization, superAdmin.getCandidateAnalytics);

	// Super Admin User & Job Deletion & Restoration APIs
	router.delete("/superAdmin/user/soft-delete/:id", adminAuthorization, userController.softDelete);
	router.delete("/superAdmin/user/hard-delete/:id", adminAuthorization, userController.hardDelete);
	router.delete("/superAdmin/user/permanently-delete/:id", adminAuthorization, userController.hardDelete);
	router.put("/superAdmin/user/restore/:id", adminAuthorization, userController.restoreUser);
	router.get("/superAdmin/deleted-users", adminAuthorization, userController.getDeletedUsers);

	router.delete("/superAdmin/job/soft-delete/:id", adminAuthorization, jobController.softDelete);
	router.delete("/superAdmin/job/hard-delete/:id", adminAuthorization, jobController.hardDelete);
	router.delete("/superAdmin/job/permanently-delete/:id", adminAuthorization, jobController.hardDelete);
	router.put("/superAdmin/job/restore/:id", adminAuthorization, jobController.restoreJob);
	router.get("/superAdmin/deleted-jobs", adminAuthorization, jobController.getDeletedJobs);
};
