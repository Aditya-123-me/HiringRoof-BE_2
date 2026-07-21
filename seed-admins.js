const mongoose = require("mongoose");
require("dotenv").config();

const mongoUrl = process.env.MONGO_URL;

if (!mongoUrl) {
  console.error("MONGO_URL is not defined in .env file!");
  process.exit(1);
}

console.log("Connecting to MongoDB...");

mongoose.connect(mongoUrl)
  .then(async () => {
    console.log("Connected successfully to MongoDB.");
    
    const db = mongoose.connection.db;
    const collection = db.collection("adminusers");

    // Clear existing seeded users if they exist
    await collection.deleteMany({
      email: { $in: ["superadmin@hiringroof.com", "admin@hiringroof.com"] }
    });

    const superAdmin = {
      name: "Super Admin",
      email: "superadmin@hiringroof.com",
      password: "SuperAdminSecurePass123!",
      profileImage: "https://firebasestorage.googleapis.com/v0/b/hiringroof.appspot.com/o/static%20data%2FAvtar.png?alt=media&token=5a84bf05-8bec-4f7b-b9f3-deb8205b8cef",
      type: "superAdmin",
      number: "1234567890",
      address: "HiringRoof HQ",
      userId: "superadmin_0",
      referralCode: "SUPERADMINREF",
      totalJobsAssigned: 0,
      jobsDone: 0,
      jobsInProgress: 0,
      userEnrolled: 0,
      companyEnrolled: 0,
      interviewScheduled: 0,
      interviewTaken: 0,
      totalHired: 0,
      jobTarget: [],
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const admin = {
      name: "Admin",
      email: "admin@hiringroof.com",
      password: "AdminSecurePass123!",
      profileImage: "https://firebasestorage.googleapis.com/v0/b/hiringroof.appspot.com/o/static%20data%2FAvtar.png?alt=media&token=5a84bf05-8bec-4f7b-b9f3-deb8205b8cef",
      type: "hr",
      number: "0987654321",
      address: "HiringRoof Admin Office",
      userId: "admin_0",
      referralCode: "ADMINREF",
      totalJobsAssigned: 0,
      jobsDone: 0,
      jobsInProgress: 0,
      userEnrolled: 0,
      companyEnrolled: 0,
      interviewScheduled: 0,
      interviewTaken: 0,
      totalHired: 0,
      jobTarget: [],
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const hr = {
      name: "HR Admin",
      email: "hr@hiringroof.com",
      password: "HRSecurePass123!",
      profileImage: "https://firebasestorage.googleapis.com/v0/b/hiringroof.appspot.com/o/static%20data%2FAvtar.png?alt=media&token=5a84bf05-8bec-4f7b-b9f3-deb8205b8cef",
      type: "hr",
      number: "1122334455",
      address: "HiringRoof HR Office",
      userId: "hr_0",
      referralCode: "HRREF",
      totalJobsAssigned: 0,
      jobsDone: 0,
      jobsInProgress: 0,
      userEnrolled: 0,
      companyEnrolled: 0,
      interviewScheduled: 0,
      interviewTaken: 0,
      totalHired: 0,
      jobTarget: [],
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertMany([superAdmin, admin, hr]);
    console.log("Seeding complete. Inserted documents:", result.insertedCount);
    
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("Error connecting or seeding database:", err);
    process.exit(1);
  });
