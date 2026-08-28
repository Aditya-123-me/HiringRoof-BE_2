const jobController = require("../controllers/job.controller");
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

};
