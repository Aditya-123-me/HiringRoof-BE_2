const authorization = require("../middleware/authorization.middleware");
const paymentController = require("../controllers/payment.controller");

module.exports = (router) => {
	router.post("/payment/jobPost/:id", authorization, paymentController.jobPostPayment);
    
	router.post("/payment/service", authorization, paymentController.servicePayment);

	router.get("/payment/paymentStatus/:merchantTransactionId", authorization, paymentController.status);
};
