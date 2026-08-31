const mongoose = require("mongoose");
const config = require("../app/config/config");
const User = require("../app/models/user.model");

async function run() {
	try {
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected to MongoDB");

		const count = await User.countDocuments({});
		console.log("Total users in database:", count);

		// Find user by phone number
		const userByPhone = await User.findOne({ phone: "9142796983" });
		console.log("User by phone '9142796983':", userByPhone);

		// Find user by phone number using regex
		const userByPhoneRegex = await User.findOne({ phone: /9142796983/ });
		console.log("User by phone regex /9142796983/:", userByPhoneRegex);

		// Find any 5 users
		const sampleUsers = await User.find({}).limit(5).lean();
		console.log("Sample users:", sampleUsers.map(u => ({ name: u.name, phone: u.phone, email: u.email, userType: u.userType })));

	} catch (err) {
		console.error(err);
	} finally {
		await mongoose.disconnect();
	}
}

run();
