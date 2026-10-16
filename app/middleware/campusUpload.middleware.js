const multer = require("multer");
const path = require("path");

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_FILE_SIZE, files: 1 },
	fileFilter: (req, file, cb) => {
		const extension = path.extname(file.originalname || "").toLowerCase();
		if (!ALLOWED_EXTENSIONS.includes(extension)) return cb(new Error("Only .xlsx, .xls and .csv files are allowed !!"));
		cb(null, true);
	},
});

const campusUpload = (req, res, next) => {
	upload.any()(req, res, (err) => {
		if (err) {
			const msg = err instanceof multer.MulterError ? `${err.message} (max ${MAX_FILE_SIZE / (1024 * 1024)} MB) !!` : err.message;
			return res.status(400).json({ status: false, msg });
		}
		req.file = Array.isArray(req.files) && req.files.length ? req.files[0] : null;
		return next();
	});
};

module.exports = campusUpload;
