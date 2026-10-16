const campusJobController = require("../controllers/campusJob.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (router, io) => {
	router.post("/v1/campus/jobs", adminAuthorization, campusJobController.createJob);

	router.get("/v1/campus/jobs", adminAuthorization, campusJobController.getJobs);

	router.post("/v1/campus/jobs/:job_id/nominate", adminAuthorization, campusJobController.nominateStudents);
};
