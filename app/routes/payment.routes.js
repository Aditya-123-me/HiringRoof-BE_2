const authorization = require("../middleware/authorization.middleware");
const paymentController = require("../controllers/payment.controller");

const upload = require("../middleware/multer.middleware");

module.exports = (router) => {
	router.post("/payment/jobPost/:id", authorization, paymentController.jobPostPayment);
    
	router.post("/payment/service", authorization, paymentController.servicePayment);

	router.post("/payment/manual-service", authorization, upload.single("screenshot"), paymentController.manualServicePayment);

	router.get("/payment/paymentStatus/:merchantTransactionId", authorization, paymentController.status);
};
