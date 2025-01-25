const resourceController = require("../controllers/resource.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");
const authorization = require("../middleware/authorization.middleware");
const upload = require("../middleware/multer.middleware");

module.exports = (router, io) => {
	
	router.get("/admin/resources", adminAuthorization, resourceController.getResourcesByPoster);
	router.get("/admin/all-resources", adminAuthorization, resourceController.getAllResources);
	// router.put("/user/block-unblock", adminAuthorization, userController.blockUnblock);
};
