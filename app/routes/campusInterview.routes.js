const campusInterviewController = require("../controllers/campusInterview.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (router, io) => {
	router.post("/v1/campus/interviews/schedule", adminAuthorization, campusInterviewController.scheduleInterview);

	router.get("/v1/campus/interviews", adminAuthorization, campusInterviewController.getInterviews);

	router.patch("/v1/campus/interviews/:interview_id/status", adminAuthorization, campusInterviewController.updateInterviewStatus);
};
