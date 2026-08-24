require("dotenv").config();
const connectDB = require("../app/config/mongodb.config");
const mongoose = require("mongoose");
const addonController = require("../app/controllers/addon.controller");
const addonModel = require("../app/models/addon.model");
const serviceModel = require("../app/models/service.model");
const userModel = require("../app/models/user.model");
const adminUserModel = require("../app/models/adminUser.model");

async function runTests() {
	console.log("=== CONNECTING TO DATABASE ===");
	await connectDB();

	// Temporary mock entities for testing
	let testAdmin = null;
	let testRecruiter = null;
	let createdAddon = null;
	let createdService = null;

	try {
		console.log("\n=== PREPARING TEST DATA ===");
		// 1. Find or create a mock admin user
		testAdmin = await adminUserModel.findOne();
		if (!testAdmin) {
			console.log("No admin found in DB, creating a mock one...");
			testAdmin = await adminUserModel.create({
				name: "Test Admin",
				email: "test_admin_" + Date.now() + "@test.com",
				password: "hash_password",
				number: "1234567890",
				type: "superAdmin"
			});
		}

		// 2. Find or create a mock recruiter (user)
		testRecruiter = await userModel.findOne({ userType: "companyRecruiter" });
		if (!testRecruiter) {
			console.log("No recruiter found in DB, creating a mock one...");
			testRecruiter = await userModel.create({
				name: "Test Recruiter",
				email: "test_recruiter_" + Date.now() + "@test.com",
				password: "hash_password",
				phone: "9876543210",
				userType: "companyRecruiter"
			});
		}

		console.log(`Using Admin ID: ${testAdmin._id}`);
		console.log(`Using Recruiter ID: ${testRecruiter._id}`);

		// Mock Express Response Helper
		const mockResponse = () => {
			const res = {};
			res.status = (code) => {
				res.statusCode = code;
				return res;
			};
			res.json = (data) => {
				res.data = data;
				return res;
			};
			res.send = (data) => {
				res.data = data;
				return res;
			};
			return res;
		};

		// Test 1: CREATE ADDON
		console.log("\n=== TEST 1: CREATE ADDON ===");
		const req1 = {
			user: testAdmin,
			body: {
				title: "Automated Tech Screening",
				amount: 350,
				desc: "Pre-screen candidates with coding tasks",
				points: ["Python test", "JS test", "Automatic grading"],
				type: "general"
			}
		};
		const res1 = mockResponse();
		await addonController.create(req1, res1);

		console.log("Response Code:", res1.statusCode);
		console.log("Response Data:", res1.data);
		if (res1.statusCode !== 200 || !res1.data.status) {
			throw new Error("Create Addon failed!");
		}
		createdAddon = res1.data.data;

		// Test 2: LIST ADMIN
		console.log("\n=== TEST 2: LIST ADMIN ADDONS ===");
		const req2 = { user: testAdmin };
		const res2 = mockResponse();
		await addonController.listAdmin(req2, res2);
		console.log("Response Code:", res2.statusCode);
		console.log("Returned count:", res2.data.data.length);
		if (res2.statusCode !== 200 || res2.data.data.length === 0) {
			throw new Error("List Admin Addons failed!");
		}

		// Test 3: LIST RECRUITER (Active Only)
		console.log("\n=== TEST 3: LIST RECRUITER ADDONS ===");
		const req3 = { user: testRecruiter };
		const res3 = mockResponse();
		await addonController.listRecruiter(req3, res3);
		console.log("Response Code:", res3.statusCode);
		console.log("Active count:", res3.data.data.length);
		if (res3.statusCode !== 200) {
			throw new Error("List Recruiter Addons failed!");
		}

		// Test 4: UPDATE ADDON
		console.log("\n=== TEST 4: UPDATE ADDON ===");
		const req4 = {
			user: testAdmin,
			params: { id: createdAddon._id },
			body: {
				amount: 400,
				desc: "Updated description for tech screening addon."
			}
		};
		const res4 = mockResponse();
		await addonController.update(req4, res4);
		console.log("Response Code:", res4.statusCode);
		console.log("Updated Amount:", res4.data.data.amount);
		if (res4.statusCode !== 200 || res4.data.data.amount !== 400) {
			throw new Error("Update Addon failed!");
		}

		// Test 5: SIMULATE PURCHASE AND APPROVED SERVICE RECORD
		console.log("\n=== TEST 5: SIMULATE PURCHASE LINKAGE ===");
		createdService = await serviceModel.create({
			userId: testRecruiter._id,
			addonId: createdAddon._id,
			date: new Date().toISOString().split("T")[0],
			expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
			time: "14:00",
			totalAmount: 408, // 400 + 2% GST
			serviceData: {
				title: createdAddon.title,
				amount: createdAddon.amount,
				desc: createdAddon.desc,
				points: createdAddon.points
			},
			merchantTransactionId: `MOCK_TXN_${Date.now()}`,
			isPaymentSuccess: true,
			isActive: true,
			paymentStatus: "APPROVED" // Analytics looks at approved payments
		});
		console.log(`Created purchased service record: ${createdService._id}`);

		// Test 6: SUBMIT FEEDBACK
		console.log("\n=== TEST 6: SUBMIT FEEDBACK ===");
		const req6 = {
			user: testRecruiter,
			params: { serviceId: createdService._id },
			body: {
				rating: 5,
				reviewText: "Excellent tool! Saved us hours of technical screening."
			}
		};
		const res6 = mockResponse();
		await addonController.submitFeedback(req6, res6);
		console.log("Response Code:", res6.statusCode);
		console.log("Review Text:", res6.data.data.reviewText);
		if (res6.statusCode !== 200 || res6.data.data.rating !== 5) {
			throw new Error("Submit Feedback failed!");
		}

		// Test 7: GET PURCHASES FOR SPECIFIC ADDON
		console.log("\n=== TEST 7: GET PURCHASERS LIST ===");
		const req7 = {
			user: testAdmin,
			params: { id: createdAddon._id }
		};
		const res7 = mockResponse();
		await addonController.purchases(req7, res7);
		console.log("Response Code:", res7.statusCode);
		console.log("Purchaser records count:", res7.data.data.length);
		if (res7.statusCode !== 200 || res7.data.data.length !== 1) {
			throw new Error("Get Purchasers list failed!");
		}

		// Test 8: ANALYTICS & REVENUE REPORTS
		console.log("\n=== TEST 8: GET ANALYTICS ===");
		const req8 = { user: testAdmin };
		const res8 = mockResponse();
		await addonController.analytics(req8, res8);
		console.log("Response Code:", res8.statusCode);
		console.log("Overall Analytics Summary:");
		console.log(" - Total Earnings:", res8.data.data.totalEarnings);
		console.log(" - Total Purchases Count:", res8.data.data.totalPurchasesCount);
		console.log(" - Monthly Earnings Breakdown:", res8.data.data.monthlyEarnings);
		const testAddonStats = res8.data.data.popularAddons.find(x => x._id && x._id.toString() === createdAddon._id.toString());
		console.log(" - Created Addon Stats:", testAddonStats);

		if (res8.statusCode !== 200 || !testAddonStats || testAddonStats.purchaseCount !== 1) {
			throw new Error("Addon Analytics failed!");
		}

		// Test 9: DELETE (DEACTIVATE) ADDON
		console.log("\n=== TEST 9: DEACTIVATE ADDON ===");
		const req9 = {
			user: testAdmin,
			params: { id: createdAddon._id }
		};
		const res9 = mockResponse();
		await addonController.delete(req9, res9);
		console.log("Response Code:", res9.statusCode);
		console.log("Active Status after deactivation:", res9.data.data.isActive);
		if (res9.statusCode !== 200 || res9.data.data.isActive !== false) {
			throw new Error("Deactivate Addon failed!");
		}

		console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");

	} catch (e) {
		console.error("\n!!! TEST ERROR FATAL FAILURE !!!");
		console.error(e);
	} finally {
		console.log("\n=== CLEANING UP TEST DOCUMENTS ===");
		if (createdAddon) {
			await addonModel.findByIdAndDelete(createdAddon._id);
			console.log(`Cleaned up Addon: ${createdAddon._id}`);
		}
		if (createdService) {
			await serviceModel.findByIdAndDelete(createdService._id);
			console.log(`Cleaned up Service Purchase: ${createdService._id}`);
		}
		
		// If we created temporary users, clean them up as well
		if (testAdmin && testAdmin.name === "Test Admin") {
			await adminUserModel.findByIdAndDelete(testAdmin._id);
			console.log("Cleaned up temporary Test Admin.");
		}
		if (testRecruiter && testRecruiter.name === "Test Recruiter") {
			await userModel.findByIdAndDelete(testRecruiter._id);
			console.log("Cleaned up temporary Test Recruiter.");
		}

		await mongoose.disconnect();
		console.log("Database disconnected.");
	}
}

runTests();
