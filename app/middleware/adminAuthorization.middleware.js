const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { JWT_SECRET } = require("../config/config");
const adminUser = require("../models/adminUser.model");
const subAdminUser = require("../models/subAdmin.model");

const adminAuthorization = async (req, res, next) => {
	try {
		let token = req.headers["authorization"] || req.query.token || req.query.auth;
		if (token && token.startsWith("Bearer ")) {
			token = token.slice(7).trim();
		}

		if (!token) return res.status(200).send({ success: false, msg: "A token is required for authentication !!" });

		const verify = jwt.verify(token, JWT_SECRET);

		req.user = (await adminUser.findById(verify._id)) || (await subAdminUser.findById(verify._id));

		if (req.user) next();
		else
			res.status(401).json({
				status: false,
				msg: "Not authorized, token failed !! 😖",
			});
	} catch (error) {
		res.status(400).json({
			status: false,
			msg: "Not authorized, token failed !! 😖",
			meta: error.message,
		});
	}
};

module.exports = adminAuthorization;
