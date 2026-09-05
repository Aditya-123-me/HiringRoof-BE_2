module.exports = (router) => {
	router.get("/health-check", (req, res) => {
		res.send({
			status: true,
			msg: "HIRING ROOF CI/CD Automated Deployment Verified - Updated GitHub Secrets! 🔐🚀",
			version: "1.0.2",
			deployedAt: new Date().toISOString(),
			branch: "anubhaw"
		});
	});
};
