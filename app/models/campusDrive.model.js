const mongoose = require("mongoose");

const campusDriveSchema = mongoose.Schema(
	{
		drive_title: { type: String, required: [true, "Drive title is required"], trim: true },
		recruiting_company_id: { type: mongoose.Schema.Types.ObjectId, ref: "campusRecruiters", required: true, index: true },
		host_college_id: { type: mongoose.Schema.Types.ObjectId, ref: "colleges", required: true, index: true },
		drive_type: { type: String, enum: { values: ["On Campus", "Off Campus", "Virtual", "Pool Drive"], message: "drive_type must be one of On Campus, Off Campus, Virtual, Pool Drive" }, required: [true, "Drive type is required"] },
		drive_date: { type: Date, required: [true, "Drive date is required"] },
		package_range: { type: String, required: [true, "Package range is required"], trim: true },
		selection_rounds: {
			type: [String],
			required: [true, "Selection rounds are required"],
			validate: [(value) => Array.isArray(value) && value.filter(Boolean).length > 0, "Selection rounds must contain at least one value"],
		},
		status: { type: String, enum: ["Scheduled", "In Progress", "Completed", "Cancelled"], default: "Scheduled" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("campusDrives", campusDriveSchema);
