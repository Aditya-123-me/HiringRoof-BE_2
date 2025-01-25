const { mongoose } = require("mongoose");
const { MONGO_URL } = require("./config");

const connectDB = async () => {
	try {
		const conn = await mongoose.connect(MONGO_URL);
		console.log(`MongoDB Connected: ${conn.connection.host}`);
	} catch (error) {
		console.error(error.message);
		process.exit();
	}
};

module.exports = connectDB;
