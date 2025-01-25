const mongoose = require("mongoose");

const ticketSchema = mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		ticketNo: { type: Number },
		desc: { type: String },
		status: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("ticket", ticketSchema);
