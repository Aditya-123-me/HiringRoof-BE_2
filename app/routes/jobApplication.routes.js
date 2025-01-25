const jobApplication = require("../controllers/jobApplication.controller");
const authorization = require("../middleware/authorization.middleware");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (router, io) => {
	router.post("/jobApplication/apply/:id", authorization, (req, res) => jobApplication.apply(req, res, io));

	router.delete("/jobApplication/remove/:id", authorization, (req, res) => jobApplication.remove(req, res, io));

	router.get("/jobApplication/get/:page", authorization, jobApplication.get);

	router.put("/jobApplication/update/:_id", authorization, jobApplication.all);

	// Company Start
	router.get("/jobApplication/get-applications-list/:page", authorization, jobApplication.getApplications);
	router.get("/jobApplication/get-shortlist/:page", authorization, jobApplication.getShortlist);
	router.get("/jobApplication/get-interviews-list/:page", authorization, jobApplication.getInterviews);
	router.get("/jobApplication/get-interviews-2-list/:page", authorization, jobApplication.getInterviews2);
	router.get("/jobApplication/get-selected-candidates/:page", authorization, jobApplication.getSelectedCandidates);

	router.put("/jobApplication/shortlist/:_id", authorization, (req, res) => jobApplication.shortlist(req, res, io));
	router.put("/jobApplication/not-selected/:_id", authorization, (req, res) => jobApplication.notSelected(req, res, io));
	router.put("/jobApplication/interview-select/:_id", authorization, (req, res) =>
		jobApplication.doInterviewSelect(req, res, io)
	);
	router.put("/jobApplication/interview-2-select/:_id", authorization, (req, res) =>
		jobApplication.doInterview2Select(req, res, io)
	);
	router.put("/jobApplication/selected/:_id", authorization, (req, res) => jobApplication.selected(req, res, io));
	// Company End

	// JobSeeker Start
	router.get("/jobApplication/job-seeker/get-applications-list/:page", authorization, jobApplication.getApplicationsJobSeeker);
	router.get("/jobApplication/job-seeker/get-shortlist/:page", authorization, jobApplication.getShortlistJobSeeker);
	router.get("/jobApplication/job-seeker/get-interviews-list/:page", authorization, jobApplication.getInterviewsJobSeeker);
	router.get("/jobApplication/job-seeker/get-interviews-2-list/:page", authorization, jobApplication.getInterviews2JobSeeker);
	router.get(
		"/jobApplication/job-seeker/get-selected-candidates/:page",
		authorization,
		jobApplication.getSelectedCandidatesJobSeeker
	);
	// JobSeeker End

	// Admin Start
	router.get("/jobApplication/interviews", adminAuthorization,jobApplication.getInterviewsByDate);
	router.get("/jobApplication/today-interviews", adminAuthorization,jobApplication.getInterviewsBySingleDate);
	router.get("/jobApplication/past_interviews",adminAuthorization, jobApplication.getInterviewsPassedDate);
	router.post("/jobApplication/accept-reject-reschedule", adminAuthorization, (req, res) =>
		jobApplication.acceptRejectRescheduleRequest(req, res, io)
	);
	router.post("/jobApplication/addFeedback", adminAuthorization,jobApplication.addFeedback);
	router.get("/jobApplication/getJobApplicationsByStatus", adminAuthorization,jobApplication.getJobApplicationsByStatus);
	router.get("/jobApplication/findBlockedJobsByHR",adminAuthorization, jobApplication.findBlockedJobsByHR);
	
	router.get("/jobApplication/getInterviewStats",adminAuthorization, jobApplication.getInterviewStats);
	router.get("/jobApplication/getJobTargetsByMonthAndYear",adminAuthorization, jobApplication.getJobTargetsByMonthAndYear);
	
	router.get("/jobApplication/getMonthJobHR",adminAuthorization, jobApplication.getMonthJobHR);
	// Admin End

};
