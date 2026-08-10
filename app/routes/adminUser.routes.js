const adminUser = require("../controllers/adminUser.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");
const upload = require("../middleware/multer.middleware");

module.exports = (router, io) => {
	router.post("/admin/hr/login", adminUser.hrLogin);

	router.post("/adminUser/create", adminAuthorization, upload.single("profileImage"), adminUser.create);

	router.get("/adminUser/get-all-hr-admin", adminAuthorization, adminUser.getAll);

	router.get("/adminUser/:id", adminAuthorization, adminUser.getOne);

	router.put("/adminUser/update/:id", adminAuthorization, upload.single("profileImage"), adminUser.update);

	router.delete("/adminUser/delete/:id", adminAuthorization, adminUser.deleteUser);

	router.get("/adminUser/delete/users", adminAuthorization, adminUser.getDeleteUsers);

	router.delete("/adminUser/permanently-delete/:id", adminAuthorization, adminUser.permanentlyDelete);

	router.put("/adminUser/set-job-target-by-month-year/:id", adminAuthorization, adminUser.setJobTarget);

	router.put("/adminUser/update-month-job-target", adminAuthorization, adminUser.updateJobTarget);

	router.put("/adminUser/assign-job", adminAuthorization, (req, res) => adminUser.assignJob(req, res, io));

	router.put("/adminUser/remove-assign-job", adminAuthorization, adminUser.removeAssignJob);

	// router.get("/adminUser/assign-job/:userId", adminAuthorization, adminUser.getAssignJob);

	router.get("/adminUser/getJobApplicationsHRdetails/:jobId", adminAuthorization, adminUser.getJobApplicationsHRdetails);

	router.get("/getJobHRdetails", adminUser.getJobHRdetails);

	router.get("/getUnassignedJobs", adminUser.getUnassignedJobs);

	router.post("/adminUser/updateInterviewStatus", adminAuthorization, adminUser.updateInterviewStatus);

	router.post("/adminUser/rejectInterview", adminAuthorization, (req, res) => adminUser.rejectInterview(req, res, io));

	// SuperAdmin Badge Removal Request Management APIs
	router.get("/adminUser/badge-remove-requests", adminAuthorization, adminUser.getAllBadgeRemoveRequests);
	router.get("/adminUser/badge-remove-request/:id", adminAuthorization, adminUser.getSingleBadgeRemoveRequest);
	router.put("/adminUser/handle-badge-remove-request/:id", adminAuthorization, adminUser.handleBadgeRemoveRequest);
};

