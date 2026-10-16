const campusDashboardController = require("../controllers/campusDashboard.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (router, io) => {
	router.get("/v1/campus/dashboard/stats", adminAuthorization, campusDashboardController.getStats);

	router.get("/v1/campus/dashboard/department-progress", adminAuthorization, campusDashboardController.getDepartmentProgress);
};
