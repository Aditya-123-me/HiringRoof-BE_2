const campusController = require("../controllers/campus.controller");
const upload = require("../middleware/multer.middleware");

module.exports = (router) => {
	// ==========================================
	// 1. College & University Registration & Directory
	// ==========================================
	router.post("/campus/colleges/register", campusController.registerCollege);
	router.post("/campus/colleges", campusController.registerCollege);
	router.get("/campus/colleges", campusController.getColleges);
	router.get("/campus/colleges/:id", campusController.getCollegeById);
	router.put("/campus/colleges/:id", campusController.updateCollege);
	router.delete("/campus/colleges/:id", campusController.deleteCollege);

	// ==========================================
	// 2. Company Registration for Campus Recruitment
	// ==========================================
	router.post("/campus/companies/register", campusController.registerCompany);
	router.post("/campus/companies", campusController.registerCompany);
	router.get("/campus/companies", campusController.getCompanies);
	router.get("/campus/companies/:id", campusController.getCompanyById);
	router.put("/campus/companies/:id", campusController.updateCompany);
	router.delete("/campus/companies/:id", campusController.deleteCompany);

	// ==========================================
	// 3. Student Details, Directory & Bulk Upload
	// ==========================================
	router.post("/campus/students/add", campusController.addStudent);
	router.post("/campus/students", campusController.addStudent);
	// Supports both JSON array and Excel / CSV file upload (field name: 'file' or 'excelSheet')
	router.post(
		"/campus/students/bulk-upload",
		upload.single("file"),
		campusController.bulkUploadStudents
	);
	router.get("/campus/students", campusController.getStudents);
	router.get("/campus/students/:id", campusController.getStudentById);
	router.put("/campus/students/:id", campusController.updateStudent);
	router.patch("/campus/students/:studentId/status", campusController.updateStudentStatus);
	router.delete("/campus/students/:id", campusController.deleteStudent);

	// ==========================================
	// 4. Corporate Campus Hiring Requirements / Openings
	// ==========================================
	router.post("/campus/requirements/publish", campusController.publishRequirement);
	router.post("/campus/requirements", campusController.publishRequirement);
	router.get("/campus/requirements", campusController.getRequirements);
	router.get("/campus/requirements/:id", campusController.getRequirementById);
	router.put("/campus/requirements/:id", campusController.updateRequirement);
	router.patch("/campus/requirements/:id/status", campusController.updateRequirementStatus);
	router.post("/campus/requirements/:id/apply", campusController.applyToRequirement);
	router.get("/campus/requirements/:id/applicants", campusController.getRequirementApplicants);
	router.delete("/campus/requirements/:id", campusController.deleteRequirement);

	// ==========================================
	// 5. Campus Placement & Recruitment Drives Management
	// ==========================================
	router.post("/campus/drives/create", campusController.createDrive);
	router.post("/campus/drives", campusController.createDrive);
	router.get("/campus/drives", campusController.getDrives);
	router.get("/campus/drives/:id", campusController.getDriveById);
	router.put("/campus/drives/:id", campusController.updateDrive);
	router.patch("/campus/drives/:id/status", campusController.updateDriveStatus);
	router.post("/campus/drives/:id/register", campusController.registerForDrive);
	router.delete("/campus/drives/:id", campusController.deleteDrive);

	// ==========================================
	// 6. Interview Scheduling & Candidate Status Tracking
	// ==========================================
	router.post("/campus/interviews/schedule", campusController.scheduleInterview);
	router.post("/campus/interviews", campusController.scheduleInterview);
	router.get("/campus/interviews", campusController.getInterviews);
	router.get("/campus/interviews/:id", campusController.getInterviewById);
	router.put("/campus/interviews/:id", campusController.updateInterview);
	router.patch("/campus/interviews/:id/status", campusController.updateInterviewStatus);
	router.delete("/campus/interviews/:id", campusController.deleteInterview);

	// ==========================================
	// 7. Placement Officer Dashboard, Analytics & Reports
	// ==========================================
	router.get("/campus/reports", campusController.getPlacementReports);
	router.get("/campus/analytics", campusController.getPlacementReports);
	router.get("/campus/stats", campusController.getCampusStats);
};
