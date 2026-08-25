const mongoose = require("mongoose");
require("dotenv").config();

// Mongoose connection URL
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://hiringroofcom:asdfghjkl1@cluster0.pnk5wah.mongodb.net/hiring_roof";

const seedServices = async () => {
	try {
		console.log("Connecting to Database...");
		await mongoose.connect(MONGO_URL);
		console.log("Database Connected successfully!");

		const db = mongoose.connection.db;
		const adminCollection = db.collection("adminusers");
		const addonCollection = db.collection("addons");

		// Find Super Admin to assign as creator
		let superadmin = await adminCollection.findOne({ email: "superadmin@hiringroof.com" });
		if (!superadmin) {
			superadmin = await adminCollection.findOne({ type: "superAdmin" });
		}
		if (!superadmin) {
			superadmin = await adminCollection.findOne({ type: "admin" });
		}
		if (!superadmin) {
			console.error("Error: Admin user not found. Please seed the admin user first.");
			process.exit(1);
		}

		const recruiterServicesData = [
			{
				title: "Recruitment and Talent Acquisition",
				amount: 499,
				points: [
					"Posting job openings on various platforms.",
					"Screening resumes and conducting initial interviews via video calls.",
					"Coordinating interview schedules remotely.",
					"Conducting virtual job fairs and networking events.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Employee Onboarding",
				amount: 499,
				points: [
					"Sending digital onboarding documents and forms.",
					"Conducting virtual orientation sessions.",
					"Providing online training modules.",
					"Setting up remote access to necessary tools and systems.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Employee Relations",
				amount: 299,
				points: [
					"Providing remote counseling and conflict resolution.",
					"Addressing employee grievances through virtual meetings.",
					"Conducting remote performance reviews and feedback sessions.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Payroll and Benefits Administration",
				amount: 999,
				points: [
					"Managing payroll processes through cloud-based systems.",
					"Handling benefits enrollment and changes remotely.",
					"Resolving payroll queries via email or phone.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Compliance and Legal Support",
				amount: 1499,
				points: [
					"Offering remote assistance with compliance audits.",
					"Guiding labor laws and regulations via email or video calls.",
					"Conducting virtual training sessions on compliance topics.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Performance Management",
				amount: 499,
				points: [
					"Implementing remote performance appraisal processes.",
					"Offering guidance on setting remote performance goals.",
					"Providing coaching and feedback virtually.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Training and Development",
				amount: 999,
				points: [
					"Developing and delivering online training programs.",
					"Facilitating virtual workshops and seminars.",
					"Creating e-learning modules for employee development.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Employee Engagement and Wellness",
				amount: 499,
				points: [
					"Organizing virtual team-building activities.",
					"Offering remote wellness programs and initiatives.",
					"Conducting surveys and feedback sessions remotely.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Offboarding",
				amount: 499,
				points: [
					"Managing remote exit interviews.",
					"Coordinating the return of company assets.",
					"Facilitating knowledge transfer and handover remotely.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Consulting and Advisory Services",
				amount: 299,
				points: [
					"Providing remote HR consulting services.",
					"Offering strategic HR guidance through virtual meetings.",
					"Conducting HR audits and assessments remotely.",
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Benefits Administration",
				amount: 299,
				points: [
					"Enrollment guidance", 
					"Changes and inquiries related to employee benefits."
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Policy Communication and Compliance",
				amount: 999,
				points: [
					"Communicating company policies and updates.", 
					"Ensuring compliance with local regulations"
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Conflict Resolution",
				amount: 999,
				points: [
					"Mediating employee disputes", 
					"Providing professional counseling", 
					"Resolving structural conflicts among employees"
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "HR Analytics and Reporting",
				amount: 299,
				points: [
					"Analyzing deep HR data sets", 
					"Generating automated analytics reports"
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Workforce Planning and Succession Planning",
				amount: 999,
				points: [
					"Developing strategic workforce plans.", 
					"Identifying team talent gaps", 
					"Succession planning walkthrough guidance"
				],
				type: "recruiterService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
		];

		const candidateServicesData = [
			{
				title: "Resume/CV Writing Services",
				amount: 99,
				desc: "Guidance and assistance in crafting or refining resumes and CVs to make them more appealing to potential employers.",
				points: [
					"Expert formatting and layout optimization",
					"Keyword optimization for ATS scanners",
					"One-on-one professional consultation"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Cover Letter Writing",
				amount: 99,
				desc: "Supporting in composing personalized cover letters tailored to specific job applications.",
				points: [
					"Personalized narrative tailoring",
					"Alignment with target job descriptions",
					"Formatted in standard business layout"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Interview Coaching",
				amount: 299,
				desc: "Conducting mock interviews, offer feedback, and provide tips on how to excel in interviews via video conferencing or phone calls.",
				points: [
					"Mock video call interview session",
					"Detailed verbal and non-verbal feedback",
					"Proven answer frameworks for common questions"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Job Search Assistance",
				amount: 299,
				desc: "Guidance on effective job search strategies, including utilizing online job boards, professional networking platforms, and social media.",
				points: [
					"Curated list of matching job portals",
					"Instruction on outreach and cold emailing",
					"ATS profile setup walkthrough"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Career Counseling",
				amount: 499,
				desc: "Providing one-on-one sessions to help candidates explore career options, set career goals, and create actionable plans.",
				points: [
					"Goal setting and timeline roadmap",
					"Interest and capability assessment",
					"Target industry salary analysis"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Skill Assessment and Development",
				amount: 499,
				desc: "Offering online assessments to evaluate candidates' skills and provide resource or enhancement recommendations.",
				points: [
					"Online capability evaluation tests",
					"Recommended learning resources",
					"Skill validation badge for profile"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Networking Support",
				amount: 299,
				desc: "Facilitating virtual networking events, workshops, or webinars to help candidates expand their professional network.",
				points: [
					"Exclusive access to virtual mixers",
					"Alumni and recruiter directories",
					"Networking outreach scripts"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Job Application Support",
				amount: 499,
				desc: "Assisting with filling out job applications, including online forms and submission processes.",
				points: [
					"Manual completion of job forms",
					"Application review and checklist checks",
					"Cover letter attachment audit"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "LinkedIn Profile Optimization",
				amount: 299,
				desc: "Guidance on creating or optimizing LinkedIn profiles to enhance visibility and attract potential employers.",
				points: [
					"Profile headline and summary re-writes",
					"Headline keyword enrichment",
					"Banner and avatar style guidance"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Virtual Job Fairs",
				amount: 499,
				desc: "Organize or participate in virtual job fairs where candidates can interact with recruiters and explore job opportunities remotely.",
				points: [
					"Access pass to upcoming job fairs",
					"Direct interview scheduling slots",
					"Company briefing notes package"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Remote Work Training",
				amount: 499,
				desc: "Offering resources and training sessions on remote work best practices, including time management, communication skills, and remote collaboration tools.",
				points: [
					"Time management guides for remote setups",
					"Collaboration tools tutorial",
					"Communication etiquette checklist"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Personal Branding",
				amount: 99,
				desc: "Assisting candidates in developing their brand online through social media and professional networking platforms.",
				points: [
					"Social media audit and profile cleanups",
					"Consistent visual styling template",
					"Post scheduling and outreach strategies"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Salary Negotiation Coaching",
				amount: 99,
				desc: "Guide on negotiating salary and benefits packages during job offers.",
				points: [
					"Market value salary database lookup",
					"Role-play negotiation session",
					"Counter-offer script templates"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Mental Health Support",
				amount: 299,
				desc: "Providing resources and referrals to mental health professionals or support groups to address job-related stress or anxiety.",
				points: [
					"Confidential support referral channels",
					"Stress management resources",
					"Work-life balance planning guides"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Remote Onboarding Support",
				amount: 299,
				desc: "Assisting candidates with the remote onboarding process, including paperwork, orientation sessions, and technology setup.",
				points: [
					"Document compilation checklist",
					"Orientation preparation guide",
					"Tool setup tech support call"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				title: "Remote Internship Opportunities",
				amount: 499,
				desc: "Facilitating remote internship placements for students or recent graduates to gain valuable work experience.",
				points: [
					"Guaranteed placement match check",
					"Mentorship pairing program",
					"Internship certification upon completion"
				],
				type: "candidateService",
				createdBy: superadmin._id,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
		];

		const combinedServices = [...recruiterServicesData, ...candidateServicesData];

		console.log(`Seeding ${combinedServices.length} default Recruiter and Candidate Services...`);
		for (const service of combinedServices) {
			const result = await addonCollection.updateOne(
				{ title: service.title },
				{ $set: service },
				{ upsert: true }
			);
			console.log(`Service '${service.title}' seeded. Result:`, result);
		}

		console.log("Services seeding completed successfully!");
		await mongoose.disconnect();
		process.exit(0);
	} catch (error) {
		console.error("Services seeding failed:", error);
		process.exit(1);
	}
};

seedServices();
