@echo off
REM Database Initialization Script for Windows
REM This script sets up the database from scratch

echo Starting database initialization...
echo.

REM Check if .env exists
if not exist .env (
    echo .env file not found. Creating from .env.example...
    copy .env.example .env
    echo Created .env file. Please update it with your database credentials.
    echo.
    echo Press any key to continue after updating .env...
    pause >nul
)

REM Generate Prisma Client
echo Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo Failed to generate Prisma Client
    exit /b 1
)
echo Prisma Client generated
echo.

REM Run migrations
echo Running database migrations...
call npx prisma migrate dev --name init
if errorlevel 1 (
    echo Failed to run migrations
    exit /b 1
)
echo Migrations completed
echo.

REM Seed database
echo Seeding database with demo data...
call npm run prisma:seed
if errorlevel 1 (
    echo Failed to seed database
    exit /b 1
)
echo Database seeded
echo.

echo Database initialization complete!
echo.
echo Test credentials:
echo    Owner:   owner@demo.com / password123
echo    Manager: manager@demo.com / password123
echo    Staff:   staff@demo.com / password123
echo.
echo To view data, run: npx prisma studio
echo.
pause
