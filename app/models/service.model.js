const mongoose = require("mongoose");

const serviceSchema = mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		date: { type: String, required: true },
		expireDate: { type: String, required: true },
		time: { type: String, required: true },
		totalAmount: { type: Number, required: true },
		serviceData: { type: Object, required: true },
		merchantTransactionId: { type: String, default: "" },
		isPaymentSuccess: { type: Boolean, default: false },
		isActive: { type: Boolean, default: null },
		paymentScreenshot: { type: String, default: "" },
		paymentStatus: {
			type: String,
			enum: ["PENDING", "APPROVED", "REJECTED"],
			default: "PENDING",
		},
		rejectionReason: { type: String, default: "" },
		rating: { type: Number, default: 0 },
		reviewText: { type: String, default: "" },
		workDone: { type: [String], default: [] },
		workPending: { type: [String], default: [] },
		progressPercentage: { type: Number, default: 0 }
	},
	{ timestamps: true }
);

module.exports = mongoose.model("service", serviceSchema);
