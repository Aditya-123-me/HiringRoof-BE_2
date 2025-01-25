const multer = require("multer");

const upload = multer({
	storage: multer.memoryStorage(),
});

module.exports = upload;

// multer.diskStorage({
// 	destination: (req, file, cb) => {
// 		cb(null, "upload");
// 	},
// 	filename: (req, file, cb) => {
// 		cb(null, Date.now().toString() + "_" + file.originalname);
// 	},
// });
