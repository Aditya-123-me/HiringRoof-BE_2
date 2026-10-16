const mongoose = require("mongoose");

const collegeSchema = mongoose.Schema(
	{
		college_name: { type: String, required: [true, "College name is required"], trim: true },
		affiliated_university: { type: String, required: [true, "Affiliated university is required"], trim: true },
		college_code: { type: String, required: [true, "College code is required"], trim: true, unique: true, index: true },
		state: { type: String, required: [true, "State is required"], trim: true },
		city: { type: String, required: [true, "City is required"], trim: true },
		nirf_rank: { type: Number, default: null },
		accreditation: { type: String, default: "", trim: true },
		tpo_name: { type: String, required: [true, "TPO name is required"], trim: true },
		tpo_email: { type: String, required: [true, "TPO email is required"], trim: true, lowercase: true },
		tpo_phone: { type: String, required: [true, "TPO phone is required"], trim: true },
		college_website: { type: String, default: "", trim: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("colleges", collegeSchema);
