@echo off
echo ===================================================
echo   Goa Panchayat Tracker - GitHub Sync Utility
echo ===================================================
echo.
echo Syncing files to local repository:
echo C:\Users\DELL\GitHub\Goa-Panchayati-Raj
echo.

:: Ensure destination folders exist
if not exist "C:\Users\DELL\GitHub\Goa-Panchayati-Raj\data" mkdir "C:\Users\DELL\GitHub\Goa-Panchayati-Raj\data"

:: Sync data directory
echo Syncing data/ folder...
xcopy /s /y /i /q "C:\Users\DELL\.gemini\antigravity\scratch\goa-panchayat-tracker\data" "C:\Users\DELL\GitHub\Goa-Panchayati-Raj\data"

:: Copy code files
echo Syncing app.js...
copy /y "C:\Users\DELL\.gemini\antigravity\scratch\goa-panchayat-tracker\app.js" "C:\Users\DELL\GitHub\Goa-Panchayati-Raj\app.js" >nul

echo Syncing styles.css...
copy /y "C:\Users\DELL\.gemini\antigravity\scratch\goa-panchayat-tracker\styles.css" "C:\Users\DELL\GitHub\Goa-Panchayati-Raj\styles.css" >nul

echo Syncing index.html...
copy /y "C:\Users\DELL\.gemini\antigravity\scratch\goa-panchayat-tracker\index.html" "C:\Users\DELL\GitHub\Goa-Panchayati-Raj\index.html" >nul

echo Syncing .gitignore...
copy /y "C:\Users\DELL\.gemini\antigravity\scratch\goa-panchayat-tracker\.gitignore" "C:\Users\DELL\GitHub\Goa-Panchayati-Raj\.gitignore" >nul

echo.
echo ===================================================
echo   Sync completed! Open GitHub Desktop to commit.
echo ===================================================
echo.
pause
