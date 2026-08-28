const addonModel = require("../models/addon.model");
const serviceModel = require("../models/service.model");
const userModel = require("../models/user.model");

const addonController = {};

// Create a new addon (Admin / Super Admin only)
addonController.create = async (req, res) => {
	try {
		const { title, amount, desc, points, type } = req.body;
		if (!title) return res.status(400).json({ status: false, msg: "Title is required!" });
		if (amount === undefined || amount === null) return res.status(400).json({ status: false, msg: "Amount is required!" });

		const addon = await addonModel.create({
			title,
			amount: Number(amount),
			desc: desc || "",
			points: Array.isArray(points) ? points : [],
			type: type || "general",
			createdBy: req.user._id,
		});

		return res.status(200).json({
			status: true,
			msg: "Addon created successfully!",
			data: addon,
		});
	} catch (error) {
		console.error("Error in addonController.create:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Update an addon (Admin / Super Admin only)
addonController.update = async (req, res) => {
	try {
		const { id } = req.params;
		const { title, amount, desc, points, type, isActive } = req.body;

		const addon = await addonModel.findById(id);
		if (!addon) return res.status(404).json({ status: false, msg: "Addon not found!" });

		if (title !== undefined) addon.title = title;
		if (amount !== undefined) addon.amount = Number(amount);
		if (desc !== undefined) addon.desc = desc;
		if (points !== undefined) addon.points = Array.isArray(points) ? points : [];
		if (type !== undefined) addon.type = type;
		if (isActive !== undefined) addon.isActive = isActive;

		await addon.save();

		return res.status(200).json({
			status: true,
			msg: "Addon updated successfully!",
			data: addon,
		});
	} catch (error) {
		console.error("Error in addonController.update:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Soft delete/deactivate an addon (Admin / Super Admin only)
addonController.delete = async (req, res) => {
	try {
		const { id } = req.params;
		const addon = await addonModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
		if (!addon) return res.status(404).json({ status: false, msg: "Addon not found!" });

		return res.status(200).json({
			status: true,
			msg: "Addon deactivated successfully!",
			data: addon,
		});
	} catch (error) {
		console.error("Error in addonController.delete:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get all addons (including inactive ones) with creator information (Admin / Super Admin only)
addonController.listAdmin = async (req, res) => {
	try {
		const addons = await addonModel.find()
			.populate("createdBy", "name email")
			.sort({ createdAt: -1 });

		const addON = addons.filter((a) => a.type === "jobPostAddon" || a.type === "general");
		const recruiterServices = addons.filter((a) => a.type === "recruiterService");
		const candidateServices = addons.filter((a) => a.type === "candidateService");

		return res.status(200).json({
			status: true,
			msg: "All addons fetched successfully!",
			data: {
				addON,
				recruiterServices,
				candidateServices,
				all: addons,
			},
		});
	} catch (error) {
		console.error("Error in addonController.listAdmin:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get active addons list separated by category (Public/Recruiters/Candidates)
addonController.listRecruiter = async (req, res) => {
	try {
		const addons = await addonModel.find({ isActive: true }).sort({ createdAt: -1 });

		const addON = addons.filter((a) => a.type === "jobPostAddon" || a.type === "general");
		const recruiterServices = addons.filter((a) => a.type === "recruiterService");
		const candidateServices = addons.filter((a) => a.type === "candidateService");

		return res.status(200).json({
			status: true,
			msg: "Active addons and services fetched successfully!",
			data: {
				addON,
				recruiterServices,
				candidateServices,
				all: addons,
			},
		});
	} catch (error) {
		console.error("Error in addonController.listRecruiter:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get earnings and popularity analytics for all addons (Admin / Super Admin only)
addonController.analytics = async (req, res) => {
	try {
		// Retrieve all approved addon purchases
		const approvedPurchases = await serviceModel.find({ paymentStatus: "APPROVED" })
			.populate("userId", "name email phone profileImage")
			.populate("addonId");

		let totalEarnings = 0;
		const addonStatsMap = {};

		// Initialize catalog addon stats
		const allAddons = await addonModel.find();
		allAddons.forEach((addon) => {
			addonStatsMap[addon._id.toString()] = {
				_id: addon._id,
				title: addon.title,
				amount: addon.amount,
				type: addon.type,
				purchaseCount: 0,
				earnings: 0,
				ratingsSum: 0,
				ratingsCount: 0,
				feedbacks: [],
			};
		});

		// Build statistics from approved purchases
		approvedPurchases.forEach((purchase) => {
			totalEarnings += purchase.totalAmount;

			let addonKey = purchase.addonId ? purchase.addonId._id.toString() : null;

			// Handle legacy static purchases gracefully by placing in a mock legacy bucket
			if (!addonKey) {
				const staticTitle = purchase.serviceData?.title || "Legacy Addon";
				addonKey = `legacy_${staticTitle}`;
				if (!addonStatsMap[addonKey]) {
					addonStatsMap[addonKey] = {
						_id: null,
						title: staticTitle,
						amount: purchase.serviceData?.amount || purchase.totalAmount,
						type: purchase.serviceData?.type || "general",
						purchaseCount: 0,
						earnings: 0,
						ratingsSum: 0,
						ratingsCount: 0,
						feedbacks: [],
					};
				}
			}

			const stat = addonStatsMap[addonKey];
			stat.purchaseCount += 1;
			stat.earnings += purchase.totalAmount;

			if (purchase.rating > 0) {
				stat.ratingsSum += purchase.rating;
				stat.ratingsCount += 1;
			}

			if (purchase.reviewText || purchase.rating > 0) {
				stat.feedbacks.push({
					buyerName: purchase.userId?.name || "Anonymous",
					buyerEmail: purchase.userId?.email || "",
					rating: purchase.rating,
					reviewText: purchase.reviewText,
					date: purchase.date,
				});
			}
		});

		// Compute average ratings and sort by popularity (purchaseCount)
		const popularAddons = Object.values(addonStatsMap).map((stat) => {
			return {
				...stat,
				averageRating: stat.ratingsCount > 0 ? parseFloat((stat.ratingsSum / stat.ratingsCount).toFixed(2)) : 0,
			};
		}).sort((a, b) => b.purchaseCount - a.purchaseCount);

		// Group monthly earnings
		const monthlyEarnings = {};
		approvedPurchases.forEach((purchase) => {
			if (purchase.date) {
				const month = purchase.date.substring(0, 7); // Output format: "YYYY-MM"
				monthlyEarnings[month] = (monthlyEarnings[month] || 0) + purchase.totalAmount;
			}
		});

		return res.status(200).json({
			status: true,
			msg: "Analytics computed successfully!",
			data: {
				totalEarnings,
				totalPurchasesCount: approvedPurchases.length,
				popularAddons,
				monthlyEarnings,
			},
		});
	} catch (error) {
		console.error("Error in addonController.analytics:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get purchases list of a specific addon (Admin / Super Admin only)
addonController.purchases = async (req, res) => {
	try {
		const { id } = req.params;
		const addon = await addonModel.findById(id);
		if (!addon) {
			return res.status(404).json({ status: false, msg: "Addon not found" });
		}

		// Find purchases that match either by addonId, or legacy purchases matching by title/name
		const purchases = await serviceModel.find({
			$or: [
				{ addonId: id },
				{
					$and: [
						{ $or: [{ addonId: null }, { addonId: { $exists: false } }] },
						{
							$or: [
								{ "serviceData.title": addon.title },
								{ "serviceData.name": addon.title }
							]
						}
					]
				}
			]
		})
		.populate("userId", "name email phone profileImage")
		.populate("assignedHR", "name email number phone profileImage")
		.populate("assignedBy", "name email")
		.sort({ createdAt: -1 });

		return res.status(200).json({
			status: true,
			msg: "Addon purchases list fetched successfully!",
			data: purchases,
		});
	} catch (error) {
		console.error("Error in addonController.purchases:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Submit feedback/rating for a purchased service addon (Recruiter only)
addonController.submitFeedback = async (req, res) => {
	try {
		const { serviceId } = req.params;
		const { rating, reviewText } = req.body;

		if (rating === undefined || rating === null) {
			return res.status(400).json({ status: false, msg: "Rating value is required!" });
		}
		const ratingNum = Number(rating);
		if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
			return res.status(400).json({ status: false, msg: "Rating must be a number between 1 and 5!" });
		}

		const purchase = await serviceModel.findOneAndUpdate(
			{ _id: serviceId, userId: req.user._id },
			{ rating: ratingNum, reviewText: reviewText || "" },
			{ new: true }
		);

		if (!purchase) {
			return res.status(404).json({ status: false, msg: "Purchased addon service not found or unauthorized!" });
		}

		return res.status(200).json({
			status: true,
			msg: "Feedback and rating submitted successfully!",
			data: purchase,
		});
	} catch (error) {
		console.error("Error in addonController.submitFeedback:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = addonController;
