const campusDriveController = require("../controllers/campusDrive.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (router, io) => {
	router.post("/v1/campus/drives", adminAuthorization, campusDriveController.createDrive);

	router.get("/v1/campus/drives", adminAuthorization, campusDriveController.getDrives);
};
