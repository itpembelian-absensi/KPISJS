#!/bin/bash

# Hentikan eksekusi jika ada perintah yang error
set -e

echo "🚀 Memulai deployment KPISJS..."

echo "📥 Menarik kode terbaru dari git..."
git pull

echo "📦 Menginstall dependencies..."
npm install

echo "🐳 Build dan restart Docker container..."
docker compose up -d --build

echo "✅ Deployment selesai! Aplikasi berjalan di port 7101."
