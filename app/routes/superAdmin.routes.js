const superAdmin = require("../controllers/superAdmin.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");
const upload = require("../middleware/multer.middleware");

module.exports = (router, io) => {
	router.post("/superAdmin/login", superAdmin.adminLogin);
	router.get("/superAdmin/get-all-feedback", adminAuthorization, superAdmin.getFeedbackDescending);
	router.get("/superAdmin/get-interviews-history", adminAuthorization, superAdmin.getInterviewsHistory);
	router.get("/superAdmin/getJobTargetsSuperAdmin", adminAuthorization, superAdmin.getJobTargetsSuperAdmin);
	router.get("/superAdmin/getStatistics", adminAuthorization, superAdmin.getStatistics);
};
