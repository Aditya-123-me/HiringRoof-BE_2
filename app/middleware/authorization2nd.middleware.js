const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { JWT_SECRET } = require("../config/config");

const authorization2nd = async (req, res, next) => {
	try {
		const token = req.headers["authorization"];

		if (token) {
			const verify = jwt.verify(token, JWT_SECRET);
			req.user = await User.findById(verify._id).select("-otp");
			next();
		} else next();
	} catch (error) {
		console.log(error);
		res.status(400).json({
			status: false,
			msg: "Not authorized, token failed !! 😖",
			meta: error.message,
		});
	}
};
module.exports = authorization2nd;
