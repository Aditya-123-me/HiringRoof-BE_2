const mongoose = require("mongoose");
const config = require("../app/config/config");
const User = require("../app/models/user.model");
const { normalizePhone } = require("../app/util/normalizeCandidateData");

async function run() {
	try {
		await mongoose.connect(config.MONGO_URL);
		
		let value = "9142796983";
		let query = {};
		query.phone = normalizePhone(value);
		query.isDeleted = { $ne: true };
		
		console.log("Query:", query);
		
		const users = await User.find(query).lean();
		console.log("Found users length:", users.length);
		console.log("Users:", users);
	} catch (e) {
		console.error(e);
	} finally {
		await mongoose.disconnect();
	}
}
run();
