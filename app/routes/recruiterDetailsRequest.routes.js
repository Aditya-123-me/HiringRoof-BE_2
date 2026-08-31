const controller = require("../controllers/recruiterDetailsRequest.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");
const upload = require("../middleware/multer.middleware");

module.exports = (router) => {
	// HR Endpoints
	router.post("/recruiter-request/submit", adminAuthorization, upload.single("screenshot"), controller.submitRequest);
	router.get("/recruiter-request/my-requests", adminAuthorization, controller.myRequests);
	router.get("/recruiter-request/status/:recruiterId", adminAuthorization, controller.status);

	// Super Admin Endpoints
	router.get("/superAdmin/recruiter-requests", adminAuthorization, (req, res, next) => {
		if (req.user.type !== "admin") {
			return res.status(403).json({ status: false, msg: "Access denied. Super Admin only." });
		}
		next();
	}, controller.allRequests);

	router.put("/superAdmin/recruiter-request/verify/:id", adminAuthorization, (req, res, next) => {
		if (req.user.type !== "admin") {
			return res.status(403).json({ status: false, msg: "Access denied. Super Admin only." });
		}
		next();
	}, controller.verifyRequest);
};
