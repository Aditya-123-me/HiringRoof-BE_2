const mongoose = require("mongoose");

const addonSchema = mongoose.Schema(
	{
		title: { type: String, required: true, trim: true },
		amount: { type: Number, required: true },
		desc: { type: String, default: "" },
		points: { type: [String], default: [] },
		type: { type: String, enum: ["general", "jobPostAddon"], default: "general" },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser", required: true },
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
);

module.exports = mongoose.model("addon", addonSchema);
