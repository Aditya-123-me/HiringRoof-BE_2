# HiringRoof Backend CI/CD Setup Guide

## 1. Project & Environment Details
* **Local Project Directory**: `E:\Anb_Carfts_Projects\Target CV\HVProject\HiringRoof\HiringRoofWorkingDir\HiringRoof-BE_2_Old`
* **GitHub Repository**: `https://github.com/Aditya-123-me/HiringRoof-BE_2.git`
* **Target Deployment Branch**: `anubhaw`
* **Target Server IP**: `194.238.16.167`
* **Server Target Directory**: `/var/www/html/hiringroof-backend`
* **Backend Application Port**: `8521`
* **Automated Health Check URL**: `http://194.238.16.167:8521/api/health-check`

---

## 2. GitHub Secrets Setup
Configured in GitHub Repository: **`Settings -> Secrets and variables -> Actions -> Repository secrets`**

| Secret Name | Value | Purpose |
| :--- | :--- | :--- |
| `SERVER_HOST` | `194.238.16.167` | Production VPS IP |
| `SERVER_USER` | `root` | VPS SSH Username |
| `SERVER_PASSWORD` | `Fycvpsroot@1234` | VPS SSH Authentication Password |
| `SERVER_PORT` | `22` | SSH Port |

---

## 3. GitHub Actions Workflow Configuration
**File Location**: `.github/workflows/deploy.yml`

```yaml
name: Deploy HiringRoof Backend

on:
  push:
    branches:
      - anubhaw

jobs:
  deploy:
    name: Build & Deploy Backend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Dependencies
        run: npm install

      - name: Deploy to Server via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          password: ${{ secrets.SERVER_PASSWORD }}
          port: ${{ secrets.SERVER_PORT || 22 }}
          script: |
            set -e
            echo "🚀 Deploying Backend (anubhaw branch) to /var/www/html/hiringroof-backend..."
            git config --global --add safe.directory /var/www/html/hiringroof-backend || true
            mkdir -p /var/www/html/hiringroof-backend
            cd /var/www/html/hiringroof-backend
            if [ ! -d ".git" ]; then
              echo "Initializing git repository on server..."
              git init
            fi
            git remote set-url origin https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/Aditya-123-me/HiringRoof-BE_2.git || git remote add origin https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/Aditya-123-me/HiringRoof-BE_2.git
            git fetch origin anubhaw
            git reset --hard origin/anubhaw
            git checkout -B anubhaw origin/anubhaw
            git pull origin anubhaw
            npm install --omit=dev
            pm2 delete hiringroof-backend || true
            pm2 start index.js --name "hiringroof-backend"
            pm2 save
            echo "✅ Backend Deployment Complete!"
```

---

## 4. Code Implementation Details

### A. Health Check Route Definition
**File Location**: `app/routes/health.routes.js`

```javascript
module.exports = (router) => {
	router.get("/health-check", (req, res) => {
		res.send({
			status: true,
			msg: "HIRING ROOF CI/CD Automated Deployment Verified! 🚀",
			deployedAt: new Date().toISOString(),
			branch: "anubhaw"
		});
	});
};
```

### B. Express Server Entrypoint Route Loader
**File Location**: `index.js`

```javascript
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

connectDB();

const corsOptions = {
	origin: "*",
	optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));

const routesPath = path.join(__dirname, "app/routes");
const routeFiles = fs.readdirSync(routesPath);

routeFiles.forEach((routeFile) => {
	if (routeFile !== "index.js" && routeFile.endsWith(".js")) {
		const routeModule = require(path.join(routesPath, routeFile));
		routeModule(router, io);
	}
});

app.use("/api", router);
app.get("/api", (req, res) => res.send({ msg: "HIRING ROOF Backend Server is Running!" }));

server.listen(PORT, function () {
	console.log(`Server running on port ${PORT}`);
});
```

---

## 5. Development & Deployment Workflow Commands

### Standard Developer Workflow:
```bash
# 1. Navigate to project root
cd "E:\Anb_Carfts_Projects\Target CV\HVProject\HiringRoof\HiringRoofWorkingDir\HiringRoof-BE_2_Old"

# 2. Stage changes
git add .

# 3. Commit with descriptive message
git commit -m "feat: your feature or fix description"

# 4. Push to origin anubhaw (triggers automated deployment)
git push origin anubhaw
```

---

## 6. Live API Verification

### PowerShell Verification Command:
```powershell
Invoke-RestMethod -Uri "http://194.238.16.167:8521/api/health-check" -Method Get
```

### Expected Response:
```json
{
  "status": true,
  "msg": "HIRING ROOF CI/CD Automated Deployment Verified! 🚀",
  "deployedAt": "2026-09-05T13:19:25.396Z",
  "branch": "anubhaw"
}
```
