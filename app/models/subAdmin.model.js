const mongoose = require("mongoose");

const subAdminUserSchema = mongoose.Schema(
	{
		name: { type: String, default: "", required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		type: { type: String, default: "sub-admin" },
		profileImage: {
			type: String,
			default: "",
		},
		number: { type: String, default: "", required: true },
		address: { type: String, default: "" },
		isActive: { type: Boolean, default: true },
		isDeleted: { type: Boolean, default: false },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser" },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser" },
		permissions: [
			{
				type: String,
				enum: [
					"manage_user",
					"manage_hr",
					"manage_jobs",
					"manage_admins",
					"manage_applications",
					"manage_payments",
					"manage_services",
					"manage_tickets",
					"manage_badge_requests",
				],
				default: "manage_user",
			},
		],
        subAdminID:{
            type:String,
            default:"SUB-00X"
        }
	},
	{ timestamps: true }
);

module.exports = mongoose.model("subAdminUser", subAdminUserSchema);
