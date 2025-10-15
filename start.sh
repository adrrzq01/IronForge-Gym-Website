#!/bin/bash

echo "Starting IronForge Gym Management System..."
echo

echo "Installing dependencies..."
npm install

echo
echo "Installing server dependencies..."
cd server
npm install

echo
echo "Installing client dependencies..."
cd ../client
npm install

echo
echo "Starting the application..."
cd ..
npm run dev
