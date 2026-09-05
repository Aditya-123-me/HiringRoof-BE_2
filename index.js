const express = require("express");
const app = express();
const helmet = require("helmet");
var cors = require("cors");
const morgan = require("morgan");
const router = express.Router();
require("dotenv").config();
const connectDB = require("./app/config/mongodb.config");
const socketIo = require("socket.io");
const server = require("http").createServer(app);
const path = require("path");
const fs = require("fs");
const { PORT } = require("./app/config/config");
const io = socketIo(server, {
	cors: {
		origin: "*",
	},
}).of("/socket_connection");
require("./app/util/socket")(io);
require("./app/util/SchedulingJobs")(io);

connectDB().then(async () => {
	const migratePhoneNumbers = require("./app/util/migratePhoneNumbers");
	await migratePhoneNumbers();
});

const corsOptions = {
	origin: "*",
	optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("common"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/videos", express.static(path.join(__dirname, "videos")));

app.get("/api/health-check", (req, res) => res.send({
	status: true,
	msg: "HIRING ROOF CI/CD Automated Deployment Successful! 🚀",
	deployedAt: new Date().toISOString(),
	branch: "anubhaw"
}));

app.use("/api", router);

const routesPath = path.join(__dirname, "app/routes");
const routeFiles = fs.readdirSync(routesPath);

routeFiles.forEach((routeFile) => {
	if (routeFile !== "index.js" && routeFile.endsWith(".js")) {
		const routeModule = require(path.join(routesPath, routeFile));
		routeModule(router, io);
	}
});

app.get("/api", (req, res) => res.send({ msg: "HIRING ROOF Backend Server is Running!" }));

server.listen(PORT, function () {
	console.log(`Server running on port ${PORT}`);
});
