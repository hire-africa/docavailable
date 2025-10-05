@echo off
REM Deploy to DigitalOcean using doctl CLI
REM Make sure you have doctl installed and configured

echo Deploying to DigitalOcean App Platform...

REM Get your app ID from DigitalOcean dashboard
set APP_ID=your_app_id_here

REM Trigger deployment
doctl apps create-deployment %APP_ID%

echo Deployment triggered!
echo Check your DigitalOcean dashboard for status.
