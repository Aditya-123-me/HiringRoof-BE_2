const mongoose = require("mongoose");

const chatSchema = mongoose.Schema(
	{
		roomId: { type: String },
		senderId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		text: { type: String },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("chat", chatSchema);
