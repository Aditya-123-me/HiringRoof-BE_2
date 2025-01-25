const mongoose = require("mongoose");

const locationSchema = mongoose.Schema(
	{
		cityName: { type: String, required: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("locations", locationSchema);
