## 모노레포 시작 가이드

이 저장소는 모노레포 구조로 백엔드(NestJS)와 프론트엔드(React)를 함께 관리합니다.

### 전체 시스템 실행

#### 방법 1: Docker Compose (권장)
```bash
docker-compose up -d
```

#### 방법 2: 개별 실행

**터미널 1 - 백엔드:**
```bash
npm install
npm run prisma:generate
npm run start:dev
```

**터미널 2 - 프론트엔드:**
```bash
cd client
npm install
npm run dev
```

**터미널 3 - 데이터베이스 (로컬):**
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
docker run -d -p 6379:6379 redis:7-alpine
```

### 접속 URL
- 프론트엔드: http://localhost:3001
- 백엔드 API: http://localhost:3000/api/v1
- Swagger 문서: http://localhost:3000/api

### 주의사항
- Node.js 버전 20+ 사용 권장
- 프론트엔드는 백엔드 API를 `/api`로 프록시합니다
- 백엔드 실행 전 `.env` 파일 설정 필수
