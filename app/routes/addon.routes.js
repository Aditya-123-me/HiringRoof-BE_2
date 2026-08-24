const addon = require("../controllers/addon.controller");
const authorization = require("../middleware/authorization.middleware");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (route) => {
	// Super Admin / Admin Addon Management
	route.post("/addon/create", adminAuthorization, addon.create);
	route.put("/addon/update/:id", adminAuthorization, addon.update);
	route.delete("/addon/delete/:id", adminAuthorization, addon.delete);
	route.get("/addon/admin/list", adminAuthorization, addon.listAdmin);
	route.get("/addon/analytics", adminAuthorization, addon.analytics);
	route.get("/addon/:id/purchases", adminAuthorization, addon.purchases);

	// Recruiter Addon Operations
	route.get("/addon/list", authorization, addon.listRecruiter);
	route.post("/addon/feedback/:serviceId", authorization, addon.submitFeedback);
};
