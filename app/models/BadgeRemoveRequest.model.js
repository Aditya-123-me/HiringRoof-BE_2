const mongoose = require("mongoose");

const badgeRemoveRequestSchema = mongoose.Schema(
	{
		requestedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "users",
			required: true,
		},
		requestedTo: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "adminUser",
			default: null,
		},
		reason: {
			type: String,
			default: "",
		},
		reqReceivedOn: {
			type: Date,
			default: Date.now,
		},
		requestHandledOn: {
			type: Date,
			default: null,
		},
		status: {
			type: String,
			enum: ["PENDING", "APPROVED", "REJECTED"],
			default: "PENDING",
		},
		servicedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "adminUser",
			default: null,
		},
		adminComment: {
			type: String,
			default: "",
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("badgeRemoveRequest", badgeRemoveRequestSchema);
