const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { JWT_SECRET } = require("../config/config");

const authorization = async (req, res, next) => {
	try {
		const token = req.headers["authorization"];

		if (!token) return res.status(200).send({ success: false, msg: "A token is required for authentication !!" });

		const verify = jwt.verify(token, JWT_SECRET);

		req.user = await User.findById(verify._id).select("-otp");

		if (req.user) next();
		else
			res.status(401).json({
				status: false,
				msg: "Not authorized, token failed !! 😖",
			});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			status: false,
			msg: "Not authorized, token failed !! 😖",
			meta: error.message,
		});
	}
};
module.exports = authorization;
