const subAdminUser = require("../models/subAdmin.model");
const { imageUpload } = require("../util/googleDrive.util");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/config");

const subAdmin = {};

const ALLOWED_PERMISSIONS = [
	"manage_user",
	"manage_hr",
	"manage_jobs",
	"manage_admins",
	"manage_applications",
	"manage_payments",
	"manage_services",
	"manage_tickets",
	"manage_badge_requests",
];

// Login Controller
subAdmin.login = async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ status: false, msg: "Email and Password are required !!" });
		}

		const user = await subAdminUser.findOne({ email, password, isDeleted: false });
		if (!user) {
			return res.status(404).json({ status: false, msg: "Invalid Email or Password !!" });
		}

		if (!user.isActive) {
			return res.status(403).json({ status: false, msg: "This sub-admin account is disabled. Contact administrator." });
		}

		const token = jwt.sign({ _id: user._id, type: "sub-admin" }, JWT_SECRET, { expiresIn: "60d" });

		return res.status(200).json({
			status: true,
			msg: "Sub-Admin Login Successfully !!",
			data: user,
			token,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get Self Profile
subAdmin.getMySubAdminProfile = async (req, res) => {
	try {
		const id = req.user ? req.user._id : req.params.id;
		if (!id) return res.status(400).json({ status: false, msg: "User ID missing !!" });

		const user = await subAdminUser.findById(id).populate("createdBy updatedBy", "name email");
		if (!user) return res.status(404).json({ status: false, msg: "Sub-Admin profile not found !!" });

		return res.status(200).json({ status: true, msg: "Sub-Admin profile fetched successfully !!", data: user });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Create Sub-Admin (By Super-Admin)
subAdmin.create = async (req, res) => {
	try {
		const { name, email, password, address, number, permissions } = req.body;
		if (!name || !email || !password || !number) {
			return res.status(400).json({ status: false, msg: "Name, email, password, and number are required !!" });
		}

		const existing = await subAdminUser.findOne({ email });
		if (existing) {
			return res.status(400).json({ status: false, msg: "Email already present !!" });
		}

		let parsedPermissions = ["manage_user"];
		if (permissions) {
			let rawList = permissions;
			if (typeof permissions === "string") {
				try {
					rawList = JSON.parse(permissions);
				} catch (e) {
					rawList = permissions.split(",").map((p) => p.trim());
				}
			}
			if (Array.isArray(rawList)) {
				parsedPermissions = rawList.filter((p) => ALLOWED_PERMISSIONS.includes(p));
			}
		}

		const bodyData = {
			name,
			email,
			password,
			number,
			address: address || "",
			permissions: parsedPermissions.length > 0 ? parsedPermissions : ["manage_user"],
			createdBy: req.user ? req.user._id : null,
		};

		if (req.file) {
			const imgUrl = await imageUpload(req.file, `${Date.now()}_subAdminProfile`, "userImage");
			if (imgUrl) bodyData.profileImage = imgUrl;
		}

		const newUser = await subAdminUser.create(bodyData);

		return res.status(201).json({
			status: true,
			msg: "Sub-Admin created successfully !!",
			data: newUser,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Update Sub-Admin
subAdmin.update = async (req, res) => {
	try {
		const id = req.params.id || req.user._id;
		const user = await subAdminUser.findOne({ _id: id, isDeleted: false });
		if (!user) return res.status(404).json({ status: false, msg: "Sub-Admin not found !!" });

		const { name, email, password, address, number, permissions, isActive } = req.body;
		const bodyData = {};

		if (name) bodyData.name = name;
		if (address !== undefined) bodyData.address = address;
		if (number) bodyData.number = number;
		if (password) bodyData.password = password;
		if (typeof isActive === "boolean" || isActive === "true" || isActive === "false") {
			bodyData.isActive = String(isActive) === "true";
		}

		if (email && email !== user.email) {
			const userEmail = await subAdminUser.findOne({ email });
			if (userEmail) return res.status(400).json({ status: false, msg: "Email already present !!" });
			bodyData.email = email;
		}

		if (permissions !== undefined) {
			let rawList = permissions;
			if (typeof permissions === "string") {
				try {
					rawList = JSON.parse(permissions);
				} catch (e) {
					rawList = permissions.split(",").map((p) => p.trim());
				}
			}
			if (Array.isArray(rawList)) {
				bodyData.permissions = rawList.filter((p) => ALLOWED_PERMISSIONS.includes(p));
			}
		}

		if (req.file) {
			const imgUrl = await imageUpload(req.file, `${user._id}_userImage`, "userImage");
			if (imgUrl) bodyData.profileImage = imgUrl;
		}

		if (req.user) bodyData.updatedBy = req.user._id;

		const updated = await subAdminUser.findByIdAndUpdate(id, { $set: bodyData }, { new: true });

		return res.status(200).json({
			status: true,
			msg: "Sub-Admin updated successfully !!",
			data: updated,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get Single Sub-Admin
subAdmin.getOne = async (req, res) => {
	try {
		const id = req.params.id || req.user._id;
		const user = await subAdminUser.findById(id).populate("createdBy updatedBy", "name email");
		if (!user) return res.status(404).json({ status: false, msg: "Sub-Admin not found !!" });

		return res.status(200).json({ status: true, msg: "Sub-Admin fetched successfully !!", data: user });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get All Active Sub-Admins
subAdmin.getAll = async (req, res) => {
	try {
		const page = parseInt(req.query.page) >= 1 ? parseInt(req.query.page) : 1;
		const limit = parseInt(req.query.limit) >= 1 ? parseInt(req.query.limit) : 10;
		const skip = (page - 1) * limit;

		const filter = { isDeleted: false };

		if (req.query.search) {
			const regex = new RegExp(req.query.search, "i");
			filter.$or = [{ name: regex }, { email: regex }, { number: regex }];
		}

		if (req.query.isActive !== undefined) {
			filter.isActive = String(req.query.isActive) === "true";
		}

		const totalCount = await subAdminUser.countDocuments(filter);
		const subAdmins = await subAdminUser
			.find(filter)
			.populate("createdBy updatedBy", "name email")
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(skip);

		return res.status(200).json({
			status: true,
			msg: "Sub-Admins fetched successfully !!",
			currentPage: page,
			pageCount: Math.ceil(totalCount / limit),
			totalCount,
			data: subAdmins,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Get Soft Deleted Sub-Admins
subAdmin.getDeleted = async (req, res) => {
	try {
		const subAdmins = await subAdminUser
			.find({ isDeleted: true })
			.populate("createdBy updatedBy", "name email")
			.sort({ updatedAt: -1 });

		return res.status(200).json({
			status: true,
			msg: "Deleted Sub-Admins fetched successfully !!",
			count: subAdmins.length,
			data: subAdmins,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Soft Delete Sub-Admin
subAdmin.deleteUser = async (req, res) => {
	try {
		const id = req.params.id;
		const user = await subAdminUser.findById(id);
		if (!user) return res.status(404).json({ status: false, msg: "Sub-Admin not found !!" });

		const deleted = await subAdminUser.findByIdAndUpdate(
			id,
			{ $set: { isDeleted: true, isActive: false, updatedBy: req.user ? req.user._id : null } },
			{ new: true }
		);

		return res.status(200).json({ status: true, msg: "Sub-Admin soft deleted successfully !!", data: deleted });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Permanently Delete Sub-Admin
subAdmin.permanentlyDelete = async (req, res) => {
	try {
		const id = req.params.id;
		const user = await subAdminUser.findById(id);
		if (!user) return res.status(404).json({ status: false, msg: "Sub-Admin not found !!" });

		const deleted = await subAdminUser.findByIdAndDelete(id);

		return res.status(200).json({ status: true, msg: "Sub-Admin permanently deleted !!", data: deleted });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

// Permissions Controllers
subAdmin.setPermissions = async (req, res) => {
	try {
		const id = req.params.id || req.body.subAdminId;
		const { permissions } = req.body;

		const user = await subAdminUser.findById(id);
		if (!user) return res.status(404).json({ status: false, msg: "Sub-Admin not found !!" });

		let rawList = permissions;
		if (typeof permissions === "string") {
			try {
				rawList = JSON.parse(permissions);
			} catch (e) {
				rawList = permissions.split(",").map((p) => p.trim());
			}
		}

		if (!Array.isArray(rawList)) {
			return res.status(400).json({ status: false, msg: "Permissions must be an array or comma-separated string !!" });
		}

		const validPermissions = rawList.filter((p) => ALLOWED_PERMISSIONS.includes(p));

		user.permissions = validPermissions;
		if (req.user) user.updatedBy = req.user._id;
		await user.save();

		return res.status(200).json({
			status: true,
			msg: "Permissions updated successfully !!",
			data: user.permissions,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

subAdmin.addPermission = async (req, res) => {
	try {
		const id = req.params.id || req.body.subAdminId;
		const { permission } = req.body;

		if (!permission || !ALLOWED_PERMISSIONS.includes(permission)) {
			return res.status(400).json({ status: false, msg: `Invalid permission! Allowed permissions: ${ALLOWED_PERMISSIONS.join(", ")}` });
		}

		const user = await subAdminUser.findById(id);
		if (!user) return res.status(404).json({ status: false, msg: "Sub-Admin not found !!" });

		if (!user.permissions.includes(permission)) {
			user.permissions.push(permission);
			if (req.user) user.updatedBy = req.user._id;
			await user.save();
		}

		return res.status(200).json({
			status: true,
			msg: "Permission added successfully !!",
			data: user.permissions,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

subAdmin.removePermission = async (req, res) => {
	try {
		const id = req.params.id || req.body.subAdminId;
		const { permission } = req.body;

		const user = await subAdminUser.findById(id);
		if (!user) return res.status(404).json({ status: false, msg: "Sub-Admin not found !!" });

		user.permissions = user.permissions.filter((p) => p !== permission);
		if (req.user) user.updatedBy = req.user._id;
		await user.save();

		return res.status(200).json({
			status: true,
			msg: "Permission removed successfully !!",
			data: user.permissions,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

subAdmin.getPermissions = async (req, res) => {
	try {
		const id = req.params.id || req.user._id;
		const user = await subAdminUser.findById(id).select("name email permissions");
		if (!user) return res.status(404).json({ status: false, msg: "Sub-Admin not found !!" });

		return res.status(200).json({
			status: true,
			msg: "Permissions fetched successfully !!",
			data: {
				subAdminId: user._id,
				name: user.name,
				email: user.email,
				permissions: user.permissions,
				allowedPermissions: ALLOWED_PERMISSIONS,
			},
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = subAdmin;
