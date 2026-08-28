const service = require("../controllers/service.controller");
const authorization = require("../middleware/authorization.middleware");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (route) => {
	route.post("/service/pay", authorization, service.pay);

	route.get("/service/my-services", authorization, service.myServices);
	route.get("/service/details/:id", authorization, service.getDetails);
	route.post("/service/rate-review", authorization, service.submitRateReview);
	route.get("/service/hr-assigned-services", adminAuthorization, service.getHRAssignedServices);
	route.put("/service/update-fulfillment-status/:id", adminAuthorization, service.updateFulfillmentStatus);
};
