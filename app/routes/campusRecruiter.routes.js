const campusRecruiterController = require("../controllers/campusRecruiter.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (router, io) => {
	router.post("/v1/campus/recruiters/register", adminAuthorization, campusRecruiterController.registerRecruiter);

	router.get("/v1/campus/recruiters", adminAuthorization, campusRecruiterController.getRecruiters);

	router.post("/v1/campus/recruiters/:recruiter_id/invite", adminAuthorization, campusRecruiterController.inviteRecruiter);
};
