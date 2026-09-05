module.exports = (router) => {
	router.get("/health-check", (req, res) => {
		res.send({
			status: true,
			msg: "HIRING ROOF CI/CD Automated Deployment Successful! 🚀",
			deployedAt: new Date().toISOString(),
			branch: "anubhaw"
		});
	});
};
