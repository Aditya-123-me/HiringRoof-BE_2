const freelancer = require("../controllers/freelancer.controller");
const authorization = require("../middleware/authorization.middleware");

module.exports = (route) => {
	// Public endpoint for freelancers to apply & query application status
	route.post("/freelancer/apply", freelancer.apply);
	route.get("/freelancer/applications", freelancer.getAllApplications);
	
	// Protected endpoints for Super Admin to manage applications
	route.post("/freelancer/approve/:applicationId", authorization, freelancer.approve);
	route.post("/freelancer/reject/:applicationId", authorization, freelancer.reject);
};
