# VPS Deployment
```bash
ssh root@194.238.16.167

cd /var/www/html

git clone git@github.com:Aditya-123-me/HiringRoof-BE_2.git hiringroof-backend

cd /var/www/html/hiringroof-backend

nano .env

npm install --production

pm2 start index.js --name "hiringroof-backend-new"
pm2 save
```

# Verification & Management
```bash
pm2 logs hiringroof-backend-new --lines 50
pm2 show hiringroof-backend-new
pm2 restart hiringroof-backend-new
pm2 delete hiringroof-backend-new
curl http://localhost:8521/api
node test-drive.js
```

# Deployed URL
```
http://194.238.16.167:8521
```
