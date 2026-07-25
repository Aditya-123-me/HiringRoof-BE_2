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
};
