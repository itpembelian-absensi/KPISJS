#!/bin/bash
set -e

# Tentukan direktori proyek (lokasi deploy.sh berada)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "🚀 Memulai Deployment KPISJS"
echo "🕒 Waktu: $(date '+%Y-%m-%d %H:%M:%S')"
echo "📁 Direktori: $PROJECT_DIR"
echo "=========================================="

# Flag untuk force deploy
FORCE_DEPLOY=false
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
  FORCE_DEPLOY=true
  echo "⚠️ Force deploy aktif: akan melakukan build ulang meskipun tidak ada commit baru."
fi

# 1. Ambil update dari remote repository
echo "📥 Memeriksa update dari git (origin/master)..."
git fetch origin master

CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "initial")
TARGET_COMMIT=$(git rev-parse origin/master)

echo "📌 Commit lokal saat ini : $CURRENT_COMMIT"
echo "🎯 Commit remote target  : $TARGET_COMMIT"

# Cek apakah ada commit baru
if [ "$CURRENT_COMMIT" = "$TARGET_COMMIT" ] && [ "$FORCE_DEPLOY" = false ]; then
  echo "✅ Kode sudah versi terbaru ($CURRENT_COMMIT). Tidak ada perubahan yang perlu di-deploy."
  echo "💡 Tip: Jalankan './deploy.sh --force' jika ingin memaksa rebuild."
  exit 0
fi

# 2. Analisis perubahan file jika bukan commit perdana
PKG_CHANGED=true

if [ "$CURRENT_COMMIT" != "initial" ] && [ "$CURRENT_COMMIT" != "$TARGET_COMMIT" ]; then
  CHANGED_FILES=$(git diff --name-only "$CURRENT_COMMIT" "$TARGET_COMMIT")
  echo "📄 File yang berubah antara commit:"
  echo "$CHANGED_FILES"

  # Cek apakah package.json / package-lock.json berubah
  if echo "$CHANGED_FILES" | grep -qE "^package(-lock)?\.json$"; then
    PKG_CHANGED=true
  else
    PKG_CHANGED=false
  fi
fi

# 3. Update kode lokal ke commit target
echo "🔄 Mengupdate kode ke $TARGET_COMMIT..."
git reset --hard origin/master

# 4. Install dependensi di host jika ada perubahan package
if [ "$PKG_CHANGED" = true ]; then
  echo "📦 Dependensi berubah (package.json / package-lock.json). Menjalankan npm install..."
  npm install
else
  echo "⚡ Dependensi tidak berubah. Melewati (skip) npm install di host."
fi

# 5. Build dan jalankan Docker container dengan BuildKit
echo "🐳 Membangun dan merestart Docker container..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose up -d --build

# 6. Bersihkan image dangling (tanpa menghapus layer cache aktif)
echo "🧹 Membersihkan image lama yang tidak terpakai..."
docker image prune -f

# 7. Health check
echo "🏥 Menjalankan health check pada port 7101..."
sleep 5
HEALTHY=false
for i in 1 2 3 4 5 6; do
  if curl -sf http://localhost:7101/login > /dev/null 2>&1; then
    echo "✅ Aplikasi sehat dan siap di http://localhost:7101!"
    HEALTHY=true
    break
  fi
  echo "⏳ Menunggu aplikasi siap... ($i/6)"
  sleep 5
done

if [ "$HEALTHY" = false ]; then
  echo "❌ Health check gagal setelah 30 detik! Log container:"
  docker compose logs --tail=80
  exit 1
fi

echo "=========================================="
echo "🎉 Deployment KPISJS Selesai Sukses!"
echo "=========================================="
