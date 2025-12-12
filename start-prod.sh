#!/bin/bash

# ================================================
# PortLink Production Local Build & Run Script
# AWS 배포 전 로컬에서 프로덕션 빌드 테스트용
# ================================================

set -e

echo "🚀 PortLink 프로덕션 빌드 시작..."
echo ""

# 환경 설정
export NODE_ENV=production
cp .env.production.local .env 2>/dev/null || true

# 1. PostgreSQL 시작
echo "📦 PostgreSQL 시작..."
brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || echo "  ⚠️  PostgreSQL 수동 시작 필요"

# 2. Redis 시작
echo "📦 Redis 시작..."
brew services start redis 2>/dev/null || echo "  ⚠️  Redis 수동 시작 필요"

sleep 2

# 3. Backend 빌드
echo ""
echo "🔨 Backend 빌드 중..."
cd /Users/kimminkyu/Bagelcode/Repository_Personal/PortLink
npm run build
echo "  ✅ Backend 빌드 완료"

# 4. Frontend 빌드
echo ""
echo "🔨 Frontend 빌드 중..."
cd /Users/kimminkyu/Bagelcode/Repository_Personal/PortLink/client
npm run build
echo "  ✅ Frontend 빌드 완료"

# 5. Backend 프로덕션 시작
echo ""
echo "🚀 Backend 프로덕션 서버 시작..."
cd /Users/kimminkyu/Bagelcode/Repository_Personal/PortLink
node dist/main.js > /tmp/portlink-backend-prod.log 2>&1 &
BACKEND_PID=$!
echo "  ✅ Backend PID: $BACKEND_PID"

# 6. Frontend 프리뷰 서버 시작
echo "🚀 Frontend 프리뷰 서버 시작..."
cd /Users/kimminkyu/Bagelcode/Repository_Personal/PortLink/client
npm run preview > /tmp/portlink-frontend-prod.log 2>&1 &
FRONTEND_PID=$!
echo "  ✅ Frontend PID: $FRONTEND_PID"

sleep 3

echo ""
echo "================================================"
echo "🎉 프로덕션 로컬 서버 시작 완료!"
echo "================================================"
echo ""
echo "📍 Frontend:  http://localhost:4173"
echo "📍 Backend:   http://localhost:3001"
echo ""
echo "📝 로그 확인:"
echo "   Backend:  tail -f /tmp/portlink-backend-prod.log"
echo "   Frontend: tail -f /tmp/portlink-frontend-prod.log"
echo ""
echo "📦 빌드 결과물:"
echo "   Backend:  ./dist/"
echo "   Frontend: ./client/dist/"
echo ""
echo "🛑 종료: ./stop.sh"
echo ""
