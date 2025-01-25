const ticket = require("../controllers/ticket.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");
const authorization = require("../middleware/authorization.middleware");

module.exports = (route, io) => {
	route.post("/ticket/create", authorization, (req, res) => ticket.create(req, res, io));

	route.get("/ticket/get", authorization, ticket.get);

	route.get("/ticket/get-all", adminAuthorization, ticket.getAll);

	route.put("/ticket/changeStatus/:id", adminAuthorization, ticket.changeStatus);
};
