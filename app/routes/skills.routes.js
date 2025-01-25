const skills = require("../controllers/skills.controller");
const authorization = require("../middleware/authorization.middleware");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");

module.exports = (router, io) => {
	router.get("/skills/all", authorization, (req, res) => skills.getAll(req, res, io));

	router.get("/skills/one", authorization, (req, res) => skills.one(req, res, io));

	router.post("/skills/create", adminAuthorization, (req, res) => skills.create(req, res, io));

	router.put("/skills/update", adminAuthorization, (req, res) => skills.update(req, res, io));

	router.delete("/skills/delete", adminAuthorization, (req, res) => skills.delete(req, res, io));
};
