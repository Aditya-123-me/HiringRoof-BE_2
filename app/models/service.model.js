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
	},
	{ timestamps: true }
);

module.exports = mongoose.model("service", serviceSchema);
