const mongoose = require("mongoose");
const config = require("../app/config/config");

async function debugAnalytics() {
	try {
		await mongoose.connect(config.MONGO_URL);
		console.log("Connected to DB\n");

		// 1. Inspect User userTypes
		const User = mongoose.model("users", new mongoose.Schema({}, { strict: false }));
		const userTypes = await User.distinct("userType");
		console.log("Distinct userTypes in users collection:", userTypes);

		const recruiterCountReg = await User.countDocuments({ userType: /recruiter/i });
		console.log("Users matching /recruiter/i:", recruiterCountReg);

		const companyCountReg = await User.countDocuments({ userType: /company/i });
		console.log("Users matching /company/i:", companyCountReg);

		// Sample recruiter users
		const sampleRecruiters = await User.find({ userType: { $regex: /recruiter|company/i } }).limit(5).select("name email userType");
		console.log("Sample recruiters:", sampleRecruiters);

		// 2. Inspect Job assignedHR & HR Target
		const Job = mongoose.model("jobs", new mongoose.Schema({}, { strict: false }));
		const jobsWithAssignedHR = await Job.find({ assignedHR: { $ne: null } }).select("jobTittle assignedHR serviceType");
		console.log("\nJobs with assignedHR in jobModel:", jobsWithAssignedHR.length);
		if (jobsWithAssignedHR.length > 0) {
			console.log("Sample assigned jobs:", jobsWithAssignedHR.slice(0, 5));
		}

		const AdminUser = mongoose.model("adminUsers", new mongoose.Schema({}, { strict: false }));
		const hrsWithJobs = await AdminUser.find({ "jobTarget.jobIds": { $exists: true, $not: { $size: 0 } } }).select("name email jobTarget");
		console.log("HRs with jobTarget.jobIds:", hrsWithJobs.length);
		hrsWithJobs.forEach((hr) => {
			console.log(`HR: ${hr.name} (${hr.email}) -> Job IDs count: ${hr.jobTarget?.jobIds?.length}`);
		});

		// 3. Inspect Service / Payment Revenue
		const Service = mongoose.model("services", new mongoose.Schema({}, { strict: false }));
		const services = await Service.find({}).limit(10);
		console.log("\nTotal Services count:", await Service.countDocuments({}));
		console.log("Sample service document keys & values:", services.slice(0, 3).map((s) => ({
			_id: s._id,
			serviceType: s.serviceType,
			serviceData: s.serviceData,
			totalAmount: s.totalAmount,
			amount: s.amount,
			price: s.price,
			isPaymentSuccess: s.isPaymentSuccess,
			status: s.status
		})));

		const Payment = mongoose.model("payments", new mongoose.Schema({}, { strict: false }));
		console.log("\nTotal Payments count:", await Payment.countDocuments({}));
		const samplePayments = await Payment.find({}).limit(5);
		console.log("Sample payments:", samplePayments.map((p) => ({
			_id: p._id,
			amount: p.amount,
			totalAmount: p.totalAmount,
			status: p.status,
			merchantTransactionId: p.merchantTransactionId
		})));

		// Also check jobs with addOn or serviceType or pay
		const jobsWithServiceType = await Job.find({ serviceType: { $ne: "" } }).select("jobTittle serviceType addOn isPaymentSuccess");
		console.log("\nJobs with serviceType in jobModel:", jobsWithServiceType.length);
		console.log("Sample jobs with serviceType:", jobsWithServiceType.slice(0, 5));

		mongoose.disconnect();
	} catch (err) {
		console.error(err);
		mongoose.disconnect();
	}
}

debugAnalytics();
