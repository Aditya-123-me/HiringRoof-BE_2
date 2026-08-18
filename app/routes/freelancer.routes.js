const freelancer = require("../controllers/freelancer.controller");
const authorization = require("../middleware/authorization.middleware");

module.exports = (route) => {
	// Public endpoint for freelancers to apply
	route.post("/freelancer/apply", freelancer.apply);
	
	// Protected endpoints for Super Admin to manage applications
	route.get("/freelancer/applications", authorization, freelancer.getAllApplications);
	route.post("/freelancer/approve/:applicationId", authorization, freelancer.approve);
	route.post("/freelancer/reject/:applicationId", authorization, freelancer.reject);
};
