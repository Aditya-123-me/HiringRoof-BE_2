```bash
# 1. SSH into the server
ssh root@194.238.16.167

# 2. Navigate to web directory
cd /var/www/html

# 3. Clone the repository
git clone git@github.com:Aditya-123-me/HiringRoof-BE_2.git hiringroof-backend

# 4. Navigate to the project directory
cd /var/www/html/hiringroof-backend

# 5. Create and edit env configuration
nano .env

# 6. Install dependencies
npm install --production

# 7. Start the application under PM2
pm2 start index.js --name "hiringroof-backend-new"
pm2 save

# --- Useful Verification & Management Commands ---

# Check logs
pm2 logs hiringroof-backend-new --lines 50

# Describe PM2 process
pm2 show hiringroof-backend-new

# Restart application
pm2 restart hiringroof-backend-new

# Stop and delete PM2 process
pm2 delete hiringroof-backend-new

# Test API locally
curl http://localhost:8521/api

# Run Google Drive upload verification test
node test-drive.js
```
