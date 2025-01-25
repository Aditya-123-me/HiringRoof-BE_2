const save = require("../controllers/save.controller");
const authorization = require("../middleware/authorization.middleware");

module.exports = (route) => {
	route.put("/save/:_id", authorization, save.create);

	route.get("/save/get", authorization, save.get);
};
