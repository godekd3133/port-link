#!/bin/bash

# ================================================
# PortLink Development Mode Startup Script
# ================================================

echo "🚀 PortLink 개발 모드 시작..."
echo ""

# 환경 설정
export NODE_ENV=development
cd /Users/kimminkyu/Bagelcode/Repository_Personal/PortLink
cp .env.development .env 2>/dev/null || true

# 1. PostgreSQL 확인
echo "📦 PostgreSQL 확인..."
if lsof -i :5432 > /dev/null 2>&1; then
  echo "  ✅ PostgreSQL 이미 실행 중 (포트 5432)"
else
  echo "  ⚠️  PostgreSQL이 실행되지 않음. 시작 시도..."
  brew services start postgresql@14 2>/dev/null || \
  brew services start postgresql 2>/dev/null || \
  echo "  ❌ PostgreSQL 수동 시작 필요: brew services start postgresql@14"
fi

# 2. Redis 확인
echo "📦 Redis 확인..."
if lsof -i :6379 > /dev/null 2>&1; then
  echo "  ✅ Redis 이미 실행 중 (포트 6379)"
else
  echo "  ⚠️  Redis가 실행되지 않음. 시작 시도..."
  brew services start redis 2>/dev/null || \
  echo "  ❌ Redis 수동 시작 필요: brew services start redis"
fi

# 잠시 대기
sleep 1

# 3. DB 연결 테스트
echo "🔍 DB 연결 확인..."
if nc -z localhost 5432 2>/dev/null; then
  echo "  ✅ PostgreSQL 연결됨"
else
  echo "  ❌ PostgreSQL 연결 실패 - 서비스를 확인하세요"
fi

# 4. 기존 서버 프로세스 정리
echo ""
echo "🧹 기존 프로세스 정리..."
lsof -ti :3001 | xargs kill -9 2>/dev/null && echo "  ✅ 기존 Backend 종료" || echo "  ✅ Backend 포트 사용 가능"
lsof -ti :5173 | xargs kill -9 2>/dev/null && echo "  ✅ 기존 Frontend 종료" || echo "  ✅ Frontend 포트 사용 가능"

# 5. Backend 시작 (watch 모드)
echo ""
echo "🔧 Backend 시작 (개발 모드 - Hot Reload)..."
npm run start:dev > /tmp/portlink-backend.log 2>&1 &
BACKEND_PID=$!
echo "  ✅ Backend PID: $BACKEND_PID"

# 6. Frontend 시작 (watch 모드)
echo "🎨 Frontend 시작 (개발 모드 - Hot Reload)..."
cd /Users/kimminkyu/Bagelcode/Repository_Personal/PortLink/client
npm run dev > /tmp/portlink-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  ✅ Frontend PID: $FRONTEND_PID"

# 대기
echo ""
echo "⏳ 서버 시작 대기 중..."
sleep 5

# 서버 상태 확인
echo ""
if curl -s http://localhost:3001/api/v1/health > /dev/null 2>&1; then
  echo "✅ Backend 정상 작동"
else
  echo "⏳ Backend 아직 시작 중... (로그 확인: tail -f /tmp/portlink-backend.log)"
fi

echo ""
echo "================================================"
echo "🎉 개발 서버 시작 완료!"
echo "================================================"
echo ""
echo "📍 Frontend:  http://localhost:5173"
echo "📍 Backend:   http://localhost:3001"
echo "📍 API Docs:  http://localhost:3001/api/docs"
echo ""
echo "📝 로그 확인:"
echo "   Backend:  tail -f /tmp/portlink-backend.log"
echo "   Frontend: tail -f /tmp/portlink-frontend.log"
echo ""
echo "🛑 종료: ./stop.sh"
echo ""
