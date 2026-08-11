const subAdmin = require("../controllers/sub_admin.controller");
const adminAuthorization = require("../middleware/adminAuthorization.middleware");
const upload = require("../middleware/multer.middleware");

module.exports = (router, io) => {
	// Sub-Admin Auth & Self Profile
	router.post("/subAdmin/login", subAdmin.login);
	router.get("/subAdmin/profile", adminAuthorization, subAdmin.getOne);
	router.get("/subAdmin/getMySubAdminProfile", adminAuthorization, subAdmin.getMySubAdminProfile);
	router.put("/subAdmin/profile", adminAuthorization, upload.single("profileImage"), subAdmin.update);

	// Super-Admin Management of Sub-Admins (CRUD)
	router.post("/subAdmin/create", adminAuthorization, upload.single("profileImage"), subAdmin.create);
	router.get("/subAdmin/all", adminAuthorization, subAdmin.getAll);
	router.get("/subAdmin/deleted", adminAuthorization, subAdmin.getDeleted);
	router.get("/subAdmin/get/:id", adminAuthorization, subAdmin.getOne);
	router.put("/subAdmin/update/:id", adminAuthorization, upload.single("profileImage"), subAdmin.update);
	router.delete("/subAdmin/delete/:id", adminAuthorization, subAdmin.deleteUser);
	router.delete("/subAdmin/permanent-delete/:id", adminAuthorization, subAdmin.permanentlyDelete);

	// Sub-Admin Permissions Management
	router.put("/subAdmin/permissions/:id", adminAuthorization, subAdmin.setPermissions);
	router.post("/subAdmin/permission/add/:id", adminAuthorization, subAdmin.addPermission);
	router.post("/subAdmin/permission/remove/:id", adminAuthorization, subAdmin.removePermission);
	router.get("/subAdmin/permissions/:id", adminAuthorization, subAdmin.getPermissions);
};
