# PortLink

**모든 직종을 위한 포트폴리오 & 협업 플랫폼**

> "GitHub는 코드를 보여주고, LinkedIn은 경력을 보여준다.
> PortLink는 당신의 성장 스토리와 작업물을 보여준다."

## 프로젝트 개요

PortLink는 **개발자, 디자이너, 마케터, 영상 제작자** 등 모든 창작 직종이 자신의 프로젝트를 공유하고, 피드백을 받고, 협업 파트너를 찾을 수 있는 플랫폼입니다.

### 차별점

| 플랫폼 | 핵심 가치 |
|--------|----------|
| LinkedIn | 네트워킹 & 채용 (회사 중심) |
| Behance | 디자인 전시 |
| GitHub | 코드 저장소 |
| **PortLink** | **작업물 기반 성장 스토리 & 크로스 직종 협업** |

### 팀 구성
- 김민규 (20241874) - 1인 팀

---

## 핵심 기능

### 1. 범용 프로필 시스템
- **15가지 직종 지원**: 개발자, 디자이너, PM, 마케터, 데이터 분석가, 콘텐츠 크리에이터, 작가, 사진작가, 영상 제작자, 음악가, 기획자, 연구원, 컨설턴트, 교육자, 기타
- **직종별 스킬 추천**: 각 직종에 맞는 스킬/도구 자동 추천
- **다양한 소셜 링크**: GitHub, LinkedIn, Behance, Dribbble, Instagram, YouTube, Twitter, Notion
- **협업/구직 상태 표시**: 협업 제안 받기, 구직 중 여부 설정

### 2. 프로젝트 포트폴리오
- **16가지 프로젝트 카테고리**: 웹앱, 모바일앱, 디자인, 브랜딩, 마케팅, 영상, 사진, 음악, 글, 연구, 데이터 분석, 케이스 스터디, 프레젠테이션, 게임, 하드웨어
- **팀 프로젝트 협업자 표시**: 같은 프로젝트에 참여한 팀원들 연결
- **다양한 외부 링크**: 저장소, 데모, Behance, Figma, YouTube 등
- **프로젝트 기간 표시**: 시작일/종료일로 타임라인 구성

### 3. 피드 & 탐색
- **직종별 필터링**: 특정 직종의 포트폴리오만 탐색
- **스킬/카테고리 필터**: 관심 분야 프로젝트 발견
- **구직자 필터**: 채용 가능한 인재 탐색
- **팀 프로젝트 필터**: 협업 프로젝트만 보기

### 4. AI 기반 포트폴리오 코치
- **직종별 맞춤 평가**: 개발자, 디자이너, PM 등 각 분야 채용 기준으로 평가
- **스킬 기반 피드백**: 사용한 도구/스킬에 대한 상세 조언
- **글쓰기 어시스턴트**: 포트폴리오 텍스트 개선, 확장, 요약

### 5. 협업 매칭 시스템
- **협업 요청 보내기/받기**: 다른 직종 전문가에게 협업 제안
- **협업 가능 사용자 검색**: 직종, 스킬, 구직 상태로 필터링
- **프로젝트 기반 협업**: 특정 프로젝트에 대한 협업 요청

### 6. 기존 기능
- JWT 인증, 좋아요/북마크/댓글
- 실시간 알림 (WebSocket)
- 대시보드 & 통계
- 에디터 픽 & 트렌딩
- 신고 & 관리자 기능

---

## 지원 직종 & 스킬

<details>
<summary>직종별 추천 스킬 목록 보기</summary>

| 직종 | 추천 스킬 |
|------|----------|
| **개발자** | JavaScript, TypeScript, Python, React, Node.js, Docker, AWS... |
| **디자이너** | Figma, Sketch, Photoshop, UI/UX Design, Prototyping... |
| **PM** | Jira, Notion, PRD 작성, A/B Testing, Roadmap 관리... |
| **마케터** | Google Analytics, SEO, Content Marketing, Growth Hacking... |
| **데이터 분석가** | Python, SQL, Tableau, Machine Learning, Data Visualization... |
| **콘텐츠 크리에이터** | Premiere Pro, Video Editing, Storytelling... |
| **작가** | Copywriting, Technical Writing, SEO Writing... |
| **사진작가** | Lightroom, Photoshop, Portrait, Post-processing... |
| **영상 제작자** | Premiere Pro, After Effects, Color Grading... |
| **음악가** | Ableton Live, Logic Pro, Mixing, Mastering... |

</details>

---

## 기술 스택

### Backend
- **Framework**: NestJS (TypeScript)
- **Web Server**: Fastify
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache/Queue**: Redis
- **Auth**: JWT, Passport
- **File Storage**: S3 호환 스토리지
- **AI**: OpenAI API
- **Real-time**: Socket.io
- **API Documentation**: Swagger

### DevOps
- Docker & Docker Compose
- CI/CD: GitHub Actions

---

## 시작하기

### 사전 요구사항
- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 7.x
- Docker & Docker Compose (선택)

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필요한 값 설정

# Prisma 설정
npm run prisma:generate
npm run prisma:migrate

# 개발 서버 실행
npm run start:dev
```

### Docker로 실행

```bash
docker-compose up -d
docker-compose logs -f
```

---

## 프로젝트 구조

```
src/
├── auth/               # 인증 모듈
├── users/              # 사용자 모듈
├── profiles/           # 프로필 모듈 (직종, 스킬 지원)
├── posts/              # 포스트 모듈 (카테고리, 협업자 지원)
├── comments/           # 댓글 모듈
├── likes/              # 좋아요 모듈
├── bookmarks/          # 북마크 모듈
├── notifications/      # 알림 모듈
├── dashboard/          # 대시보드 모듈
├── feed/               # 피드/탐색 모듈 (직종별 필터링)
├── admin/              # 관리자 모듈
├── upload/             # 파일 업로드 모듈
├── ai/                 # AI 모듈 (직종별 맞춤 평가)
├── collaborations/     # 협업 요청 모듈 (NEW)
├── common/             # 공통 모듈
│   ├── enums/          # 직종, 카테고리 enum
│   ├── decorators/
│   ├── guards/
│   └── filters/
├── config/             # 설정
├── database/           # 데이터베이스 설정
└── main.ts             # 진입점
```

---

## API 문서

개발 서버 실행 후 다음 주소에서 Swagger 문서를 확인할 수 있습니다:
- http://localhost:3000/api/docs

### 주요 API 엔드포인트

#### 프로필
```
PATCH /profiles/:id
- profession: 직종 (DEVELOPER, DESIGNER, PM, ...)
- skills: 스킬 배열
- isOpenToWork: 구직 중 여부
- isOpenToCollaborate: 협업 제안 받기
```

#### 피드
```
GET /feed
- profession: 직종 필터
- category: 카테고리 필터
- skills: 스킬 필터
- isTeamProject: 팀 프로젝트 필터
- isOpenToWork: 구직자 필터
```

#### 협업
```
POST /collaborations/requests - 협업 요청 생성
GET /collaborations/requests/received - 받은 요청
GET /collaborations/requests/sent - 보낸 요청
PATCH /collaborations/requests/:id/status - 수락/거절/취소
GET /collaborations/discover - 협업 가능 사용자 검색
```

#### AI 평가
```
POST /ai/evaluate
- profession: 직종 (직종별 맞춤 평가)
- category: 프로젝트 카테고리
- skills: 사용한 스킬
```

---

## 테스트

```bash
# 단위 테스트
npm run test

# e2e 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

---

## 라이선스

MIT
