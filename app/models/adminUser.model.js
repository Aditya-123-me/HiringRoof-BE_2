const mongoose = require("mongoose");

const adminUserSchema = mongoose.Schema(
	{
		name: { type: String, default: "", required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		profileImage: { 
			type: String,
			default: "",
		},
		type: { type: String, required: true, enum: ["admin", "hr","sub-admin"] },
		number: { type: String, default: "", required: true },
		address: { type: String, default: "" },
		userId: { type: String, unique: true },
		referralCode: { type: String, unique: true },
		totalJobsAssigned: { type: Number, default: 0 },
		jobsDone: { type: Number, default: 0 }, //NOT
		jobsInProgress: { type: Number, default: 0 }, //NOT
		userEnrolled: { type: Number, default: 0 }, //Not
		companyEnrolled: { type: Number, default: 0 }, //Not
		interviewScheduled: { type: Number, default: 0 },
		interviewTaken: { type: Number, default: 0 },
		totalHired: { type: Number, default: 0 },
		jobTarget: [
			{
				year: { type: String, default: "" },
				month: { type: String, default: "" },
				jobsDone: { type: Number, default: 0 },
				jobsTarget: { type: Number, default: 0 },
				jobIds: [
					{
						jobId: { type: mongoose.Schema.Types.ObjectId, ref: "jobs" },
						process: { type: String },
					},
				],
			},
		],
		// Inside adminUserSchema:
serviceTarget: [
	{
		month: { type: String }, // e.g. "2026-08"
		serviceIds: [
			{
				serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "service" },
				assignedDate: { type: Date, default: Date.now },
				status: { type: String, default: "ASSIGNED" }
			}
		],
		totalAssigned: { type: Number, default: 0 },
		totalCompleted: { type: Number, default: 0 }
	}
],
totalServicesAssigned: { type: Number, default: 0 },
totalServicesCompleted: { type: Number, default: 0 },
		isActive: { type: Boolean, default: true },
		isDeleted: { type: Boolean, default: false },
		isFreelancer: { type: Boolean, default: false },
		badge: { type: String, default: "" },
		
	},
	{ timestamps: true }
);

module.exports = mongoose.model("adminUser", adminUserSchema);
