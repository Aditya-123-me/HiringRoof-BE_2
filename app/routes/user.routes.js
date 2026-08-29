const userController = require("../controllers/user.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");
const authorization = require("../middleware/authorization.middleware");
const upload = require("../middleware/multer.middleware");

module.exports = (router, io) => {
	router.post("/user/login", userController.login);

	router.put("/user/verify", (req, res) => userController.verify(req, res, io));

	router.delete("/user/delete/:_id", authorization, userController.delete);

	router.get("/user/user", authorization, userController.user);

	router.get("/user/users", adminAuthorization, userController.users);
	router.get("/user/jobSeeker", adminAuthorization, userController.jobSeeker);
	router.get("/user/company", adminAuthorization, userController.company);

	router.put(
		"/user/update/:_id",
		authorization,
		upload.fields([
			{ name: "profileImage", maxCount: 1 },
			{ name: "videoUrl", maxCount: 1 },
			{ name: "resume", maxCount: 1 },
			{ name: "letter", maxCount: 1 },
			{ name: "companyLogo", maxCount: 1 },
		]),
		(req, res) => userController.update(req, res, io)
	);

	router.put("/user/project/:_id", authorization, userController.projects);

	router.put("/user/education/:_id", authorization, userController.education);

	router.post("/user/number-check", userController.numberCheck);
	router.put("/user/get-token", userController.getToken);

	router.post("/user/addRequests", authorization, userController.addRescheduleRequest);

	router.put("/user/remove-video/:id", authorization, userController.removeVideo);

	router.put("/user/remove-profile/:id", authorization, userController.removeProfile);

	router.put("/user/block-unblock", adminAuthorization, userController.blockUnblock);

	// Admin-side profile lookup and edits
	router.get("/user/user-adminSide", adminAuthorization, userController.user);
	router.put(
		"/user/update-adminSide/:_id",
		adminAuthorization,
		upload.fields([
			{ name: "profileImage", maxCount: 1 },
			{ name: "videoUrl", maxCount: 1 },
			{ name: "resume", maxCount: 1 },
			{ name: "letter", maxCount: 1 },
			{ name: "companyLogo", maxCount: 1 },
		]),
		(req, res) => userController.update(req, res, io)
	);
	router.put("/user/project-adminSide/:_id", adminAuthorization, userController.projects);
	router.put("/user/education-adminSide/:_id", adminAuthorization, userController.education);
	router.post("/user/badge-remove-request", authorization, userController.addBadgeRemoveRequest);
	router.get("/user/my-badge-remove-requests", authorization, userController.getMyBadgeRemoveRequests);
	router.get("/user/my-assigned-hrs", authorization, userController.getMyAssignedHRs);
		// Public search route for Google Crawler indexing
	router.get("/user/search-profile/:identifier/:value", userController.searchUserProfile);
};
