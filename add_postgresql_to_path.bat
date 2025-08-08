@echo off
echo Adding PostgreSQL to system PATH...
setx PATH "%PATH%;C:\Program Files\PostgreSQL\17\bin" /M
echo PostgreSQL has been added to system PATH.
echo Please restart your terminal/command prompt for changes to take effect.
pause 