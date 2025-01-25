const location = require("../controllers/location.controller");
const authorization = require("../middleware/authorization.middleware");

module.exports = (route) => {
	route.get("/location/get", location.get);
	route.post("/location/create", authorization, location.create);
	route.delete("/location/delete/:_id", authorization, location.delete);
};
