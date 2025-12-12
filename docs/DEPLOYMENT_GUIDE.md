# PortLink 배포 및 운영 가이드

## 목차
1. [백엔드 아키텍처](#1-백엔드-아키텍처)
2. [모듈 구조](#2-모듈-구조)
3. [환경 설정](#3-환경-설정)
4. [개발 환경 설정](#4-개발-환경-설정)
5. [프로덕션 환경 설정](#5-프로덕션-환경-설정)
6. [환경 전환 방법](#6-환경-전환-방법)
7. [외부 서비스 연결](#7-외부-서비스-연결)
8. [배포 옵션](#8-배포-옵션)
9. [체크리스트](#9-체크리스트)

---

## 1. 백엔드 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (React/Vite)                     │
│                      localhost:3001 (개발)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │ /api/*
┌─────────────────────────▼───────────────────────────────────┐
│                    NestJS + Fastify                          │
│                    localhost:3000 (개발)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  19개 모듈: auth, users, posts, comments, likes,    │    │
│  │  bookmarks, notifications, feed, dashboard, admin,  │    │
│  │  upload, reports, follows, mentions, mail, cache... │    │
│  └─────────────────────────────────────────────────────┘    │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
┌──────▼──────┐   ┌───────▼───────┐   ┌──────▼──────┐
│ PostgreSQL  │   │    Redis      │   │   AWS S3    │
│  :5432      │   │    :6379      │   │  (파일저장)  │
└─────────────┘   └───────────────┘   └─────────────┘
```

### 기술 스택

| 구성요소 | 기술 |
|----------|------|
| Framework | NestJS 10.x (TypeScript) |
| HTTP Server | Fastify |
| Database | PostgreSQL 15 |
| ORM | Prisma 5.x |
| Cache | Redis 7 |
| Auth | JWT + Passport |
| File Storage | AWS S3 호환 |
| Real-time | Socket.IO |
| API Docs | Swagger/OpenAPI |
| Logging | Pino |

---

## 2. 모듈 구조

### 기능 모듈 (19개)

```
src/
├── auth/           # JWT 인증, 로그인, 회원가입, 토큰 갱신
├── users/          # 사용자 CRUD
├── profiles/       # 프로필 관리 (이름, 사진, 소개, 기술스택, 링크)
├── posts/          # 포스트 CRUD (초안/공개/숨김)
├── comments/       # 댓글 + 대댓글
├── likes/          # 좋아요
├── bookmarks/      # 북마크
├── notifications/  # 인앱 알림
├── feed/           # 피드/탐색/검색/필터
├── dashboard/      # 통계 (조회수, 좋아요, 북마크 추이)
├── admin/          # 관리자 기능, 에디터 픽
├── upload/         # S3 파일 업로드 (presigned URL)
├── reports/        # 신고 기능
├── follows/        # 팔로우/팔로워
├── mentions/       # @멘션 추적
├── websocket/      # 실시간 알림 (Socket.IO)
├── mail/           # 이메일 발송 (nodemailer)
├── cache/          # Redis 캐싱
└── database/       # Prisma 서비스
```

### 공통 모듈

```
src/common/
├── decorators/     # @CurrentUser, @Roles 등
├── guards/         # JwtAuthGuard, RolesGuard
├── interceptors/   # Transform, Timeout, Logging
├── filters/        # Exception 처리
└── pipes/          # Validation
```

---

## 3. 환경 설정

### 환경 변수 전체 목록

```env
# ============================================
# 앱 설정
# ============================================
NODE_ENV=development          # development | test | production
PORT=3000                     # 서버 포트
HOST=0.0.0.0                  # 서버 호스트
API_PREFIX=api/v1             # API 경로 접두사
LOG_LEVEL=info                # debug | info | warn | error

# ============================================
# 프론트엔드/CORS
# ============================================
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001,http://localhost:3000

# ============================================
# 데이터베이스 (PostgreSQL)
# ============================================
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# Docker Compose용 (개발 환경)
POSTGRES_USER=portlink
POSTGRES_PASSWORD=portlink123
POSTGRES_DB=portlink

# ============================================
# Redis
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=               # 선택사항

# ============================================
# JWT 인증 (필수! 반드시 변경)
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_REFRESH_EXPIRES_IN=30d

# ============================================
# AWS S3 (파일 업로드)
# ============================================
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=portlink-uploads

# ============================================
# 이메일 (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM="PortLink <noreply@portlink.com>"

# ============================================
# Rate Limiting
# ============================================
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# ============================================
# Swagger 문서
# ============================================
ENABLE_SWAGGER=true           # 프로덕션에서는 false

# ============================================
# OpenAI (선택, 준비됨)
# ============================================
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

---

## 4. 개발 환경 설정

### 4.1 사전 요구사항

- Node.js >= 18.x
- npm >= 9.x
- Docker & Docker Compose (권장)

### 4.2 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 3. Docker로 PostgreSQL + Redis 실행
npm run docker:up
# 또는
docker-compose up -d postgres redis

# 4. Prisma 설정
npm run prisma:generate    # Prisma Client 생성
npm run prisma:migrate     # 마이그레이션 실행

# 5. (선택) 시드 데이터
npm run prisma:seed

# 6. 개발 서버 실행
npm run start:dev
```

### 4.3 개발 환경 .env 예시

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

DATABASE_URL="postgresql://portlink:portlink123@localhost:5432/portlink?schema=public"

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=dev-jwt-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=dev-refresh-secret-key-at-least-32-characters
JWT_REFRESH_EXPIRES_IN=30d

FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001,http://localhost:3000

ENABLE_SWAGGER=true
LOG_LEVEL=debug
```

### 4.4 유용한 개발 명령어

```bash
# 개발 서버 (watch mode)
npm run start:dev

# 디버그 모드
npm run start:debug

# Prisma Studio (DB GUI)
npm run prisma:studio

# 테스트
npm run test              # 단위 테스트
npm run test:watch        # watch 모드
npm run test:e2e          # E2E 테스트
npm run test:cov          # 커버리지

# 린트/포맷
npm run lint              # ESLint 수정
npm run lint:check        # ESLint 체크만
npm run format            # Prettier 포맷

# Docker
npm run docker:up         # 컨테이너 시작
npm run docker:down       # 컨테이너 중지
npm run docker:logs       # 로그 보기
```

---

## 5. 프로덕션 환경 설정

### 5.1 필수 변경 사항

| 항목 | 개발 | 프로덕션 | 중요도 |
|------|------|----------|--------|
| NODE_ENV | development | production | 필수 |
| JWT_SECRET | 개발용 | 32자+ 랜덤 문자열 | **필수** |
| JWT_REFRESH_SECRET | 개발용 | 32자+ 랜덤 문자열 | **필수** |
| DATABASE_URL | localhost | 실제 DB 주소 | 필수 |
| REDIS_HOST | localhost | 실제 Redis 주소 | 필수 |
| CORS_ORIGIN | localhost | 실제 도메인 | 필수 |
| ENABLE_SWAGGER | true | false | 권장 |
| LOG_LEVEL | debug | info 또는 warn | 권장 |

### 5.2 프로덕션 .env 예시

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 실제 DB (예: Supabase, AWS RDS, Railway)
DATABASE_URL="postgresql://user:password@your-db-host.com:5432/portlink?schema=public&sslmode=require"

# 실제 Redis (예: Upstash, AWS ElastiCache)
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT (반드시 강력한 랜덤 문자열로!)
JWT_SECRET=aB3$kL9#mN2@pQ5&rT8*vW1!xY4^zC7%dF0
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=hJ6&kM9#nP2@qS5*tV8!wX1^yA4%bD7$eG0
JWT_REFRESH_EXPIRES_IN=30d

# 프론트엔드
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=portlink-prod-uploads

# 이메일 (SendGrid 예시)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxx
EMAIL_FROM="PortLink <noreply@your-domain.com>"

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Swagger 끄기
ENABLE_SWAGGER=false
LOG_LEVEL=warn
```

### 5.3 JWT Secret 생성 방법

```bash
# Node.js로 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL로 생성
openssl rand -hex 32
```

---

## 6. 환경 전환 방법

### 6.1 방법 1: .env 파일 교체

```bash
# 개발 환경
cp .env.development .env

# 프로덕션 환경
cp .env.production .env
```

### 6.2 방법 2: 환경별 .env 파일 사용

파일 구조:
```
.env                  # 기본 (gitignore)
.env.development      # 개발용 템플릿
.env.production       # 프로덕션용 템플릿 (민감정보 제외)
.env.example          # 예시 파일 (git에 포함)
```

### 6.3 방법 3: 환경 변수 직접 주입 (권장)

```bash
# Docker
docker run -e NODE_ENV=production -e DATABASE_URL=... portlink

# Docker Compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 클라우드 서비스
# Railway, Render, Vercel 등에서 환경 변수 설정 UI 사용
```

### 6.4 빌드 및 실행

```bash
# 개발
npm run start:dev

# 프로덕션
npm run build
npm run start:prod

# 또는 Docker
docker build -t portlink .
docker run -p 3000:3000 --env-file .env.production portlink
```

---

## 7. 외부 서비스 연결

### 7.1 PostgreSQL 옵션

| 서비스 | 특징 | 무료 티어 |
|--------|------|-----------|
| **Supabase** | PostgreSQL + 추가기능 | 500MB DB, 1GB Storage |
| **Railway** | 간편한 설정 | $5 크레딧/월 |
| **Neon** | 서버리스 PostgreSQL | 512MB |
| **AWS RDS** | 안정적, 확장성 | 12개월 무료 |
| **PlanetScale** | MySQL만 지원 | ❌ |

**Supabase 연결 예시:**
```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### 7.2 Redis 옵션

| 서비스 | 특징 | 무료 티어 |
|--------|------|-----------|
| **Upstash** | 서버리스, 사용량 기반 | 10,000 요청/일 |
| **Railway** | 간편 설정 | $5 크레딧/월 |
| **AWS ElastiCache** | 관리형 | 무료 없음 |
| **Redis Cloud** | Redis Labs | 30MB |

**Upstash 연결 예시:**
```env
REDIS_HOST=apn1-example.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==
```

### 7.3 파일 스토리지 옵션

| 서비스 | 특징 | 무료 티어 |
|--------|------|-----------|
| **AWS S3** | 표준 | 5GB/12개월 |
| **Cloudflare R2** | S3 호환, 저렴 | 10GB |
| **Supabase Storage** | DB와 통합 | 1GB |

**AWS S3 설정:**
1. AWS Console → S3 → 버킷 생성
2. IAM → 사용자 생성 → S3 권한 부여
3. Access Key 발급

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=my-portlink-bucket
```

### 7.4 이메일 옵션

| 서비스 | 특징 | 무료 티어 |
|--------|------|-----------|
| **SendGrid** | 간편한 API | 100통/일 |
| **AWS SES** | 저렴 | 62,000통/월 (EC2에서) |
| **Gmail SMTP** | 테스트용 | 500통/일 |
| **Mailgun** | 개발자 친화적 | 5,000통/월 |

**SendGrid 설정:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="PortLink <noreply@your-domain.com>"
```

**Gmail 설정 (테스트용):**
1. Google 계정 → 2단계 인증 활성화
2. 앱 비밀번호 생성
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # 앱 비밀번호
```

---

## 8. 배포 옵션

### 8.1 Docker Compose (자체 서버)

```bash
# 프로덕션 빌드 및 실행
docker-compose -f docker-compose.yml up -d --build

# 로그 확인
docker-compose logs -f app
```

### 8.2 Railway (추천 - 간편)

1. [Railway](https://railway.app) 가입
2. "New Project" → "Deploy from GitHub repo"
3. 환경 변수 설정
4. PostgreSQL, Redis 추가 (Add Plugin)
5. 자동 배포 완료

### 8.3 Render

1. [Render](https://render.com) 가입
2. "New" → "Web Service"
3. GitHub 연결
4. 환경 변수 설정
5. PostgreSQL, Redis는 별도 서비스로 추가

### 8.4 AWS ECS/Fargate

```bash
# ECR에 이미지 푸시
aws ecr get-login-password | docker login --username AWS --password-stdin xxx.dkr.ecr.region.amazonaws.com
docker build -t portlink .
docker tag portlink:latest xxx.dkr.ecr.region.amazonaws.com/portlink:latest
docker push xxx.dkr.ecr.region.amazonaws.com/portlink:latest

# ECS 태스크 정의 및 서비스 생성
```

### 8.5 권장 조합

| 용도 | Backend | Database | Redis | Storage |
|------|---------|----------|-------|---------|
| **테스트/MVP** | Railway | Railway PostgreSQL | Upstash | Cloudflare R2 |
| **소규모** | Render | Supabase | Upstash | Supabase Storage |
| **중규모** | AWS ECS | AWS RDS | AWS ElastiCache | AWS S3 |

---

## 9. 체크리스트

### 9.1 개발 환경 체크리스트

- [ ] Node.js 18+ 설치
- [ ] `npm install` 완료
- [ ] `.env` 파일 생성 및 설정
- [ ] Docker Compose로 PostgreSQL, Redis 실행
- [ ] `npm run prisma:generate` 실행
- [ ] `npm run prisma:migrate` 실행
- [ ] `npm run start:dev`로 서버 시작
- [ ] http://localhost:3000/api/docs 접속 확인

### 9.2 프로덕션 배포 전 체크리스트

**필수:**
- [ ] `NODE_ENV=production` 설정
- [ ] JWT_SECRET 강력한 값으로 변경 (32자+)
- [ ] JWT_REFRESH_SECRET 강력한 값으로 변경 (32자+)
- [ ] DATABASE_URL 프로덕션 DB로 변경
- [ ] REDIS_HOST 프로덕션 Redis로 변경
- [ ] CORS_ORIGIN 실제 도메인으로 변경
- [ ] `npm run build` 성공
- [ ] `npm run test` 통과

**권장:**
- [ ] ENABLE_SWAGGER=false 설정
- [ ] LOG_LEVEL=warn 또는 error 설정
- [ ] SSL/HTTPS 설정
- [ ] 데이터베이스 백업 설정
- [ ] 모니터링/알림 설정

**파일 업로드 사용 시:**
- [ ] AWS S3 버킷 생성
- [ ] IAM 사용자 및 권한 설정
- [ ] AWS 환경 변수 설정

**이메일 사용 시:**
- [ ] SMTP 서비스 설정 (SendGrid 등)
- [ ] 발신자 도메인 인증 (SPF, DKIM)
- [ ] SMTP 환경 변수 설정

### 9.3 배포 후 확인 사항

- [ ] 헬스체크 엔드포인트 응답 확인
- [ ] 회원가입/로그인 테스트
- [ ] 포스트 생성 테스트
- [ ] 파일 업로드 테스트 (S3 설정 시)
- [ ] 이메일 발송 테스트 (SMTP 설정 시)
- [ ] 에러 로그 모니터링

---

## 부록: 자주 발생하는 문제

### A. Prisma 관련

```bash
# Client 생성 오류
npm run prisma:generate

# 마이그레이션 초기화
npm run prisma:migrate reset  # 주의: 데이터 삭제됨

# 스키마 변경 후
npm run prisma:migrate dev --name 변경사항설명
```

### B. Docker 관련

```bash
# 컨테이너 재시작
docker-compose restart

# 볼륨 포함 완전 삭제 (데이터 삭제됨!)
docker-compose down -v

# 이미지 재빌드
docker-compose build --no-cache
```

### C. 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인
lsof -i :3000
lsof -i :5432
lsof -i :6379

# 프로세스 종료
kill -9 <PID>
```

### D. 환경 변수 미적용

- `.env` 파일 위치 확인 (프로젝트 루트)
- 서버 재시작 필요
- Docker의 경우 `--env-file` 옵션 또는 재빌드 필요

---

## 문서 버전

- 최초 작성: 2024-12
- 마지막 수정: 2024-12
- NestJS 버전: 10.x
- Prisma 버전: 5.x
