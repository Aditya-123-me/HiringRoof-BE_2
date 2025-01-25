const service = require("../controllers/service.controller");
const authorization = require("../middleware/authorization.middleware");

module.exports = (route) => {
	route.post("/service/pay", authorization, service.pay);

	route.get("/service/my-services", authorization, service.myServices);

};
