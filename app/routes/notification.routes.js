const notification = require("../controllers/notification.controller");
const authorization = require("../middleware/authorization.middleware");

module.exports = (route) => {
	route.post("/notification/create",authorization, notification.create);

	route.get("/notification/get/:_id",authorization, notification.get);

	route.put("/notification/seen/:_id",authorization, notification.seen);

	route.delete("/notification/delete/:_id", authorization, notification.delete);
};
