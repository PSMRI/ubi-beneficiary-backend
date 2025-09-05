#!/bin/bash
rm -rf /home/ubuntu/ONEST-DEV/BACKEND-BAP/beneficiary-backend
cd /home/ubuntu/ONEST-DEV/BACKEND-BAP
#git clone https://github.com/PSMRI/beneficiary-backend -b feat-custom-fields
git clone https://github.com/PSMRI/ubi-beneficiary-backend -b main
cd /home/ubuntu/ONEST-DEV/BACKEND-BAP/beneficiary-backend
rm -rf /home/ubuntu/ONEST-DEV/BACKEND-BAP/beneficiary-backend/Dockerfile
cp -r /home/ubuntu/ONEST-DEV/BACKEND-BAP/.env .
cp -r /home/ubuntu/ONEST-DEV/BACKEND-BAP/Dockerfile .
git log -n 3
docker build -t beneficiary-backend:latest .
docker rm -f beneficiary-backend
cd /home/ubuntu/ONEST-DEV/BACKEND-BAP/
docker-compose up -d --force-recreate --no-deps
sleep 15
echo 'Logs from Backend :'
docker logs beneficiary-backend
