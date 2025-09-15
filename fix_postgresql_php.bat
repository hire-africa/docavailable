@echo off
echo Copying PostgreSQL DLLs to PHP directories...

REM Copy required DLLs to PHP ext directory
copy "C:\Program Files\PostgreSQL\17\bin\libpq.dll" "C:\xampp\php\ext\" /Y
copy "C:\Program Files\PostgreSQL\17\bin\libssl-3-x64.dll" "C:\xampp\php\ext\" /Y
copy "C:\Program Files\PostgreSQL\17\bin\libcrypto-3-x64.dll" "C:\xampp\php\ext\" /Y

REM Copy to main PHP directory as well
copy "C:\Program Files\PostgreSQL\17\bin\libpq.dll" "C:\xampp\php\" /Y
copy "C:\Program Files\PostgreSQL\17\bin\libssl-3-x64.dll" "C:\xampp\php\" /Y
copy "C:\Program Files\PostgreSQL\17\bin\libcrypto-3-x64.dll" "C:\xampp\php\" /Y

echo PostgreSQL DLLs have been copied to PHP directories.
echo Please restart your web server for changes to take effect.
pause 