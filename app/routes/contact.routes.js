const contact = require("../controllers/contact.controller");
const authorization = require("../middleware/authorization.middleware");

module.exports = (route,io) => {
	route.post("/contact/create", (req, res) => contact.create(req, res, io));
	route.get("/contact/get", authorization, contact.get);
	route.delete("/contact/delete/:_id", authorization, contact.delete);
};
