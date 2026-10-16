const campusController = require("../controllers/campus.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");
const campusUpload = require("../middleware/campusUpload.middleware");

module.exports = (router, io) => {
	router.post("/v1/campus/students/bulk-upload", adminAuthorization, campusUpload, campusController.studentsBulkUpload);

	router.get("/v1/campus/students", adminAuthorization, campusController.getStudents);
};
