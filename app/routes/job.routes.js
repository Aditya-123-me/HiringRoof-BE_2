const jobController = require("../controllers/job.controller");
const authorization = require("../middleware/authorization.middleware");
const authorization2nd = require("../middleware/authorization2nd.middleware");
const upload = require("../middleware/multer.middleware");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (router, io) => {
	router.put("/job/createUpdate", authorization, upload.single("companyLogo"), (req, res) => jobController.post(req, res, io));

	router.post("/job/create-with-addon", authorization, upload.fields([
		{ name: "screenshot", maxCount: 1 },
		{ name: "companyLogo", maxCount: 1 }
	]), (req, res) => jobController.createWithAddon(req, res, io));

	router.get("/job/addons-jobs", authorization2nd, jobController.getAddOnJobs);
	
	router.get("/job/all", jobController.getJobs);

	router.get("/job/all-after-login", authorization, jobController.getJobsAuth);

	router.get("/job/categories", jobController.getAllAvailableCategories);
	router.get("/job/:id", jobController.getOneJob);
	router.get("/job/generate-jd-pdf/:id", jobController.generateJdPdf);

	router.get("/job/search/:query", authorization2nd, jobController.search);

	router.delete("/job/delete/:_id", authorization, jobController.delete);

	router.get("/job/myJobs/:page", authorization, jobController.myJobs);
	router.get("/job/my-pending-addons", authorization, jobController.myPendingAddons);

	router.put("/job/close/:id", authorization, (req, res) => jobController.changeActiveState(req, res, io));

	router.post("/job/blockUnblockJob", adminAuthorization, jobController.blockUnblockJob);

	//bulk upload resume 
	router.post("/job/bulkUpload", adminAuthorization,upload.single("excelSheet"), jobController.bulkUpload);
	router.post("/job/singleUpload", adminAuthorization, jobController.singleUpload);
	router.put("/job/edit/:jobId", authorization, jobController.editJobPost);
};
