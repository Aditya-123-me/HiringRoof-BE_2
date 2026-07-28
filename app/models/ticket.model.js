const mongoose = require("mongoose");

const ticketSchema = mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		ticketNo: { type: Number },
		desc: { type: String },
		name: { type: String, default: "" },
		email: { type: String, default: "" },
		phone: { type: String, default: "" },
		status: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("ticket", ticketSchema);
