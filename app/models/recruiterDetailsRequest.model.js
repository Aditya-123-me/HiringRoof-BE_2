const mongoose = require("mongoose");

const recruiterDetailsRequestSchema = mongoose.Schema(
	{
		hrId: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: "adminUser", 
			required: true 
		},
		recruiterId: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: "users", 
			required: true 
		},
		paymentScreenshot: { 
			type: String, 
			required: true 
		},
		amount: { 
			type: Number, 
			required: true 
		},
		status: { 
			type: String, 
			enum: ["PENDING", "APPROVED", "REJECTED"], 
			default: "PENDING" 
		},
		rejectionReason: { 
			type: String, 
			default: "" 
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model("recruiterDetailsRequests", recruiterDetailsRequestSchema);
