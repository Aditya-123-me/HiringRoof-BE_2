const mongoose = require("mongoose");

const saveSchema = mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "users",
			required: true,
			unique: true,
		},
		jobId: [{ type: mongoose.Schema.Types.ObjectId, ref: "jobs", required: true }],
		createdAt: { type: String, default: Date.now() },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("saves", saveSchema);
