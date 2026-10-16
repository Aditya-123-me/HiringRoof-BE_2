const campusCollegeController = require("../controllers/campusCollege.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (router, io) => {
	router.post("/v1/campus/colleges/register", adminAuthorization, campusCollegeController.registerCollege);

	router.get("/v1/campus/colleges", adminAuthorization, campusCollegeController.getColleges);

	router.get("/v1/campus/colleges/:college_id/portal", adminAuthorization, campusCollegeController.getCollegePortal);
};
