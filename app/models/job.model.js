const mongoose = require("mongoose");

const jobSchema = mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
		jobTittle: { type: String, required: true },
		skillSubCategories: { type: [String] },
		skills: { type: [String] },
		skillDetails: [
			{
				main: { type: String },
				sub: { type: String },
				skills: { type: [String] },
			},
		],
		stream: { type: [String] },
		tags: { type: [String] },
		jobType: { type: String, required: true, enum: ["wfh", "wfo"] },
		workType: { type: String, required: true, enum: ["contractual", "part time", "full time", "internship", "hourly"] },
		availability: { type: Boolean, default: false },
		timePeriod: { type: String, required: true, default: "Asia/Kolkata" },
		serviceType: { type: String, default: "", enum: ["Urgent", "Premium", "Immediate", "Contact Deal", ""] },
		note: { type: String },
		pay: { type: Number, default: 0 },
		payType: { type: String, enum: ["yearly", "monthly", "weekly"] },
		location: { type: String, required: true },
		companyName: { type: String, default: "" },
		companyShortName: { type: String, default: "" },
		companyLogo: {
			type: String,
			default:
				"https://firebasestorage.googleapis.com/v0/b/hiringroof.appspot.com/o/static%20data%2FLogo.png?alt=media&token=fa7905e6-11ec-4352-af07-a1fbc200e5d8",
		},
		isSaved: { type: Boolean, default: false },
		isApplied: { type: Boolean, default: false },
		experience: { type: String, default: "" },
		vacancies: { type: Number, default: 0 },
		isActive: { type: Boolean, default: true },
		blocked: {
			reason: { type: String, default: "" },
			date: { type: Date },
			blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
		},
		blocked_status: { type: Boolean, default: false },
		addOn: { type: Object, default: null },
		isPaymentSuccess: { type: Boolean, default: false },
		merchantTransactionId: { type: String, default: "" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("jobs", jobSchema);
