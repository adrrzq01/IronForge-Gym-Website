@echo off
echo Starting IronForge Gym Management System...
echo.

echo Installing dependencies...
call npm install

echo.
echo Installing server dependencies...
cd server
call npm install

echo.
echo Installing client dependencies...
cd ..\client
call npm install

echo.
echo Starting the application...
cd ..
call npm run dev

pause
