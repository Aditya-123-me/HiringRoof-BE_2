const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		email: { type: String, default: "" },
		merchantTransactionId: { type: String, default: "" },
		type: { type: String, default: "" },
		contentData: { type: Object },
		amount: { type: Number, default: 0 },
		isPaymentSuccess: { type: Boolean, default: false },
		paymentPayload: { type: Object },
		responsePayload: { type: Object },
		invoiceURL: { type: String, default: "" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("payment", paymentSchema);
