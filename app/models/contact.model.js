const mongoose = require("mongoose");

const contactSchema = mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
		},
		message: {
			type: String,
			required: false,
		},
		createdAt: { type: String, default: Date.now() },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("contacts", contactSchema);
