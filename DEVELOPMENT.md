# PortLink 개발 가이드

## 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 값을 수정하세요:

```bash
cp .env.example .env
```

주요 환경 변수:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `JWT_SECRET`: JWT 토큰 서명 키
- `REDIS_HOST`, `REDIS_PORT`: Redis 서버 정보
- `AWS_*`: S3 업로드를 위한 AWS 자격 증명

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npm run prisma:generate

# 마이그레이션 실행
npm run prisma:migrate

# Prisma Studio 실행 (데이터베이스 GUI)
npm run prisma:studio
```

### 4. 개발 서버 실행

```bash
npm run start:dev
```

서버가 실행되면:
- API: http://localhost:3000
- Swagger 문서: http://localhost:3000/api/docs

## 프로젝트 구조

```
src/
├── auth/               # 인증 (JWT, 로그인, 회원가입)
├── users/              # 사용자 관리
├── profiles/           # 프로필 관리
├── posts/              # 포스트 CRUD
├── comments/           # 댓글 기능
├── likes/              # 좋아요 기능
├── bookmarks/          # 북마크 기능
├── notifications/      # 알림 시스템
├── feed/               # 피드/탐색
├── dashboard/          # 통계 대시보드
├── admin/              # 관리자 기능
├── upload/             # 파일 업로드
├── common/             # 공통 모듈
│   ├── decorators/     # 커스텀 데코레이터
│   ├── guards/         # 가드
│   ├── interceptors/   # 인터셉터
│   ├── filters/        # 예외 필터
│   └── pipes/          # 파이프
├── config/             # 설정
├── database/           # Prisma 서비스
└── main.ts             # 애플리케이션 진입점
```

## API 개발 가이드

### 1. 새 엔드포인트 추가

1. DTO 작성:
```typescript
// dto/create-example.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateExampleDto {
  @ApiProperty()
  @IsString()
  name: string;
}
```

2. Service 메서드 작성:
```typescript
// example.service.ts
async create(createDto: CreateExampleDto) {
  return this.prisma.example.create({
    data: createDto,
  });
}
```

3. Controller 엔드포인트 작성:
```typescript
// example.controller.ts
@Post()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Create example' })
create(@Body() createDto: CreateExampleDto) {
  return this.exampleService.create(createDto);
}
```

### 2. 인증이 필요한 엔드포인트

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
getMe(@CurrentUser() user: any) {
  return this.usersService.findById(user.userId);
}
```

### 3. 관리자 전용 엔드포인트

```typescript
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Delete(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
delete(@Param('id') id: string) {
  return this.service.delete(id);
}
```

## 데이터베이스 스키마 변경

1. `prisma/schema.prisma` 파일 수정
2. 마이그레이션 생성:
```bash
npx prisma migrate dev --name add_new_field
```

3. Prisma 클라이언트 재생성:
```bash
npm run prisma:generate
```

## 테스트

### 단위 테스트

```bash
npm run test
```

### E2E 테스트

```bash
npm run test:e2e
```

### 테스트 커버리지

```bash
npm run test:cov
```

## Docker로 실행

### 개발 환경

```bash
docker-compose up -d
```

### 로그 확인

```bash
docker-compose logs -f app
```

### 종료

```bash
docker-compose down
```

## 주요 명령어

```bash
# 개발 서버 (watch mode)
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod

# 린트
npm run lint

# 포맷
npm run format

# Prisma Studio
npm run prisma:studio

# 마이그레이션 생성
npx prisma migrate dev --name migration_name

# 마이그레이션 배포
npx prisma migrate deploy
```

## 코드 스타일

- ESLint와 Prettier 사용
- 저장 시 자동 포맷 권장
- 커밋 전 `npm run lint` 실행

## API 문서

Swagger 문서는 개발 서버 실행 후 다음 주소에서 확인:
- http://localhost:3000/api/docs

모든 엔드포인트는 다음을 포함해야 합니다:
- `@ApiTags()`: API 그룹화
- `@ApiOperation()`: 엔드포인트 설명
- `@ApiResponse()`: 응답 형식
- `@ApiBearerAuth()`: 인증 필요 시

## 배포

### 환경 변수 설정

프로덕션 환경의 `.env` 파일에 다음을 설정:
- 강력한 `JWT_SECRET`
- 실제 데이터베이스 URL
- S3 자격 증명
- SMTP 설정 (이메일 알림용)

### Docker 배포

```bash
# 이미지 빌드
docker build -t portlink .

# 컨테이너 실행
docker run -p 3000:3000 --env-file .env portlink
```
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


### Docker Compose 배포

```bash
# 전체 스택 실행
docker-compose up -d

# 마이그레이션 실행
docker-compose exec app npx prisma migrate deploy
```

## 문제 해결

### Prisma 클라이언트 오류

```bash
npm run prisma:generate
```

### 포트 충돌

`.env` 파일에서 `PORT` 변경

### 데이터베이스 연결 오류

- PostgreSQL이 실행 중인지 확인
- `DATABASE_URL`이 올바른지 확인

## 기여 가이드

1. 새 브랜치 생성: `git checkout -b feature/new-feature`
2. 변경사항 커밋: `git commit -m "Add new feature"`
3. 브랜치 푸시: `git push origin feature/new-feature`
4. Pull Request 생성

## 라이선스

MIT License
