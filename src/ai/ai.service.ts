import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiWritingAssistDto, AiWritingResponseDto, WritingAction } from './dto/ai-writing.dto';
import { AiEvaluateDto, AiEvaluateResponseDto } from './dto/ai-evaluate.dto';
import { Profession, ProfessionLabels, ProjectCategoryLabels } from '../common/enums';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('OpenAI API key not configured - AI features disabled');
    }
  }

  private checkApiKey(): void {
    if (!this.openai) {
      throw new BadRequestException('AI 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.');
    }
  }

  // 직종별 시스템 프롬프트 생성
  private getSystemPromptByProfession(profession?: Profession): string {
    const basePrompt =
      '당신은 포트폴리오 작성을 돕는 전문 어시스턴트입니다. 한국어로 응답하고, 마크다운 형식을 사용하세요.';

    const professionPrompts: Record<Profession, string> = {
      [Profession.DEVELOPER]: `${basePrompt} 개발자가 기술 면접관과 채용 담당자에게 어필할 수 있도록 도와주세요. 코드 품질, 아키텍처 설계, 문제 해결 능력을 강조하세요.`,
      [Profession.DESIGNER]: `${basePrompt} 디자이너가 크리에이티브 디렉터와 채용 담당자에게 어필할 수 있도록 도와주세요. 디자인 프로세스, 사용자 리서치, 시각적 결과물을 강조하세요.`,
      [Profession.PM]: `${basePrompt} 프로덕트 매니저가 C레벨과 채용 담당자에게 어필할 수 있도록 도와주세요. 비즈니스 임팩트, 의사결정 과정, 협업 경험을 강조하세요.`,
      [Profession.MARKETER]: `${basePrompt} 마케터가 CMO와 채용 담당자에게 어필할 수 있도록 도와주세요. ROI, 캠페인 성과, 데이터 기반 의사결정을 강조하세요.`,
      [Profession.DATA_ANALYST]: `${basePrompt} 데이터 분석가가 데이터 리드와 채용 담당자에게 어필할 수 있도록 도와주세요. 분석 방법론, 인사이트 도출, 비즈니스 임팩트를 강조하세요.`,
      [Profession.CONTENT_CREATOR]: `${basePrompt} 콘텐츠 크리에이터가 브랜드와 에이전시에게 어필할 수 있도록 도와주세요. 조회수, 참여율, 브랜드 협업 경험을 강조하세요.`,
      [Profession.WRITER]: `${basePrompt} 작가가 편집장과 클라이언트에게 어필할 수 있도록 도와주세요. 글쓰기 스타일, 독자 반응, 퍼블리싱 경험을 강조하세요.`,
      [Profession.PHOTOGRAPHER]: `${basePrompt} 사진작가가 아트 디렉터와 클라이언트에게 어필할 수 있도록 도와주세요. 포트폴리오 다양성, 기술적 숙련도, 스토리텔링을 강조하세요.`,
      [Profession.VIDEO_CREATOR]: `${basePrompt} 영상 제작자가 프로덕션 회사와 클라이언트에게 어필할 수 있도록 도와주세요. 영상 품질, 스토리텔링, 제작 경험을 강조하세요.`,
      [Profession.MUSICIAN]: `${basePrompt} 음악가가 레이블과 클라이언트에게 어필할 수 있도록 도와주세요. 음악 스타일, 협업 경험, 퍼포먼스를 강조하세요.`,
      [Profession.PLANNER]: `${basePrompt} 기획자가 경영진과 클라이언트에게 어필할 수 있도록 도와주세요. 전략적 사고, 프로젝트 성과, 문제 해결 능력을 강조하세요.`,
      [Profession.RESEARCHER]: `${basePrompt} 연구원이 연구 기관과 기업에게 어필할 수 있도록 도와주세요. 연구 방법론, 발견, 학술적 기여를 강조하세요.`,
      [Profession.CONSULTANT]: `${basePrompt} 컨설턴트가 파트너와 클라이언트에게 어필할 수 있도록 도와주세요. 문제 해결 능력, 프로젝트 성과, 산업 전문성을 강조하세요.`,
      [Profession.EDUCATOR]: `${basePrompt} 교육자가 교육 기관과 학습자에게 어필할 수 있도록 도와주세요. 교육 방법론, 학습 성과, 콘텐츠 품질을 강조하세요.`,
      [Profession.OTHER]: basePrompt,
    };

    return professionPrompts[profession || Profession.OTHER];
  }

  private getWritingPrompt(
    action: WritingAction,
    content: string,
    context: { title?: string; techStack?: string[]; skills?: string[]; profession?: Profession },
  ): string {
    const contextStr = context.title
      ? `프로젝트: "${context.title}"${context.skills?.length ? `, 스킬: ${context.skills.join(', ')}` : ''}${context.techStack?.length ? `, 기술스택: ${context.techStack.join(', ')}` : ''}`
      : '';

    const prompts: Record<WritingAction, string> = {
      [WritingAction.IMPROVE]: `다음 포트폴리오 텍스트를 더 전문적이고 매력적으로 개선해주세요. ${contextStr}\n\n원본:\n${content}\n\n개선된 버전을 작성해주세요. 마크다운 형식을 유지하세요.`,

      [WritingAction.EXPAND]: `다음 포트폴리오 텍스트를 더 상세하게 확장해주세요. 구체적인 예시, 수치, 세부사항을 추가해주세요. ${contextStr}\n\n원본:\n${content}\n\n확장된 버전을 작성해주세요. 마크다운 형식을 유지하세요.`,

      [WritingAction.SUMMARIZE]: `다음 포트폴리오 텍스트를 간결하게 요약해주세요. 핵심 내용만 남기세요. ${contextStr}\n\n원본:\n${content}\n\n요약된 버전을 작성해주세요.`,

      [WritingAction.FIX_GRAMMAR]: `다음 텍스트의 문법, 맞춤법, 어색한 표현을 교정해주세요. 의미는 유지하면서 자연스럽게 다듬어주세요.\n\n원본:\n${content}\n\n교정된 버전을 작성해주세요.`,

      [WritingAction.MAKE_PROFESSIONAL]: `다음 텍스트를 채용 담당자에게 어필할 수 있도록 전문적인 톤으로 다시 작성해주세요. ${contextStr}\n\n원본:\n${content}\n\n전문적인 버전을 작성해주세요. 마크다운 형식을 유지하세요.`,

      [WritingAction.ADD_DETAILS]: `다음 텍스트에 세부사항을 추가해주세요. 구현 방법, 사용한 도구의 이유, 성과 등을 포함해주세요. ${contextStr}\n\n원본:\n${content}\n\n세부사항이 추가된 버전을 작성해주세요. 마크다운 형식을 유지하세요.`,

      [WritingAction.GENERATE_INTRO]: `다음 정보를 바탕으로 매력적인 프로젝트 소개글을 작성해주세요. ${contextStr}\n\n입력:\n${content}\n\n프로젝트 소개글을 마크다운 형식으로 작성해주세요. 프로젝트 개요, 주요 기능, 하이라이트를 포함해주세요.`,

      [WritingAction.GENERATE_TECH_DESC]: `다음 스킬/도구에 대한 상세 설명을 작성해주세요. 각 도구를 왜 선택했는지, 어떻게 활용했는지 설명해주세요. ${contextStr}\n\n스킬/도구:\n${content}\n\n스킬 설명을 마크다운 형식으로 작성해주세요.`,
    };

    return prompts[action];
  }

  async assistWriting(dto: AiWritingAssistDto): Promise<AiWritingResponseDto> {
    this.checkApiKey();

    const prompt = this.getWritingPrompt(dto.action, dto.content, {
      title: dto.title,
      techStack: dto.techStack,
    });

    try {
      const response = await this.openai!.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              '당신은 개발자 포트폴리오 작성을 돕는 전문 어시스턴트입니다. 한국어로 응답하고, 마크다운 형식을 사용하세요. 개발자가 채용 담당자에게 어필할 수 있도록 도와주세요.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const result = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      return { result, tokensUsed };
    } catch (error: any) {
      this.logger.error('OpenAI API error:', error?.message || error);
      if (error?.response) {
        this.logger.error('Error response:', JSON.stringify(error.response.data || error.response));
      }
      throw new BadRequestException(`AI 처리 중 오류: ${error?.message || 'Unknown error'}`);
    }
  }

  async evaluatePortfolio(dto: AiEvaluateDto): Promise<AiEvaluateResponseDto> {
    this.checkApiKey();

    const professionLabel = dto.profession ? ProfessionLabels[dto.profession] : '전문가';
    const categoryLabel = dto.category ? ProjectCategoryLabels[dto.category] : '프로젝트';

    const portfolioText = `
# ${dto.title}

${dto.summary ? `## 요약\n${dto.summary}\n` : ''}

## 직종
${professionLabel}

## 프로젝트 유형
${categoryLabel}

## 스킬/도구
${dto.skills?.join(', ') || dto.techStack?.join(', ') || '명시되지 않음'}

## 내용
${dto.content}

## 링크
${dto.demoUrl ? `- 데모: ${dto.demoUrl}` : ''}
${dto.repositoryUrl ? `- 저장소: ${dto.repositoryUrl}` : ''}
${dto.behanceUrl ? `- Behance: ${dto.behanceUrl}` : ''}
${dto.figmaUrl ? `- Figma: ${dto.figmaUrl}` : ''}
${dto.youtubeUrl ? `- YouTube: ${dto.youtubeUrl}` : ''}
`.trim();

    // 직종별 맞춤 평가 기준
    const evaluationCriteria = this.getEvaluationCriteriaByProfession(dto.profession);

    const prompt = `다음 ${professionLabel} 포트폴리오를 해당 분야 채용 담당자 관점에서 평가해주세요.

${portfolioText}

평가 기준:
${evaluationCriteria}

다음 JSON 형식으로 평가 결과를 반환해주세요:
{
  "overallScore": <0-100 점수>,
  "summary": "<한줄 평가>",
  "completeness": {
    "score": <0-100>,
    "feedback": "<완성도에 대한 피드백>",
    "suggestions": ["<개선 제안1>", "<개선 제안2>"]
  },
  "technicalAppeal": {
    "score": <0-100>,
    "feedback": "<전문성/기술력에 대한 피드백>",
    "suggestions": ["<개선 제안1>", "<개선 제안2>"]
  },
  "readability": {
    "score": <0-100>,
    "feedback": "<가독성/표현력에 대한 피드백>",
    "suggestions": ["<개선 제안1>", "<개선 제안2>"]
  },
  "hiringAppeal": {
    "score": <0-100>,
    "feedback": "<채용 매력도에 대한 피드백>",
    "suggestions": ["<개선 제안1>", "<개선 제안2>"]
  },
  "strengths": ["<강점1>", "<강점2>", "<강점3>"],
  "improvements": ["<개선사항1>", "<개선사항2>", "<개선사항3>"]
}

반드시 유효한 JSON만 반환하세요. 다른 텍스트는 포함하지 마세요.`;

    try {
      const systemPrompt = this.getSystemPromptByProfession(dto.profession);
      const response = await this.openai!.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt} 포트폴리오를 객관적이고 건설적으로 평가합니다. 반드시 JSON 형식으로만 응답하세요.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const tokensUsed = response.usage?.total_tokens || 0;

      try {
        const evaluation = JSON.parse(content);
        return { ...evaluation, tokensUsed };
      } catch {
        this.logger.error('Failed to parse AI response:', content);
        throw new BadRequestException('AI 응답 파싱에 실패했습니다.');
      }
    } catch (error: any) {
      this.logger.error('OpenAI API error:', error?.message || error);
      if (error?.response) {
        this.logger.error('Error response:', JSON.stringify(error.response.data || error.response));
      }
      throw new BadRequestException(`AI 처리 중 오류: ${error?.message || 'Unknown error'}`);
    }
  }

  // 직종별 평가 기준
  private getEvaluationCriteriaByProfession(profession?: Profession): string {
    const criteria: Record<Profession, string> = {
      [Profession.DEVELOPER]: `
- 코드 품질과 아키텍처 설계
- 문제 해결 과정과 기술적 도전
- 사용 기술의 깊이와 폭
- 프로젝트의 완성도와 배포 상태
- 협업 경험과 기여도`,
      [Profession.DESIGNER]: `
- 디자인 프로세스와 리서치
- 시각적 완성도와 일관성
- 사용자 경험(UX) 고려
- 툴 활용 능력
- 다양한 프로젝트 유형 경험`,
      [Profession.PM]: `
- 비즈니스 임팩트와 성과 수치
- 의사결정 과정과 근거
- 이해관계자 관리 경험
- 프로덕트 전략과 로드맵
- 협업과 리더십 역량`,
      [Profession.MARKETER]: `
- 캠페인 성과와 ROI
- 데이터 기반 의사결정
- 다양한 채널 경험
- 브랜드 전략 이해
- 창의적 접근 방식`,
      [Profession.DATA_ANALYST]: `
- 분석 방법론과 프로세스
- 인사이트 도출 능력
- 비즈니스 임팩트
- 시각화와 커뮤니케이션
- 툴과 기술 활용 능력`,
      [Profession.CONTENT_CREATOR]: `
- 콘텐츠 품질과 일관성
- 조회수, 참여율 등 성과 지표
- 플랫폼별 최적화
- 스토리텔링 능력
- 브랜드 협업 경험`,
      [Profession.WRITER]: `
- 글쓰기 스타일과 톤
- 독자 반응과 성과
- 다양한 글 유형 경험
- 리서치 능력
- 편집과 교정 역량`,
      [Profession.PHOTOGRAPHER]: `
- 기술적 숙련도
- 포트폴리오 다양성
- 스토리텔링 능력
- 후보정 기술
- 클라이언트 작업 경험`,
      [Profession.VIDEO_CREATOR]: `
- 영상 품질과 완성도
- 스토리텔링과 편집
- 기술적 역량
- 다양한 장르 경험
- 제작 프로세스 이해`,
      [Profession.MUSICIAN]: `
- 음악적 역량과 스타일
- 제작 품질
- 협업 경험
- 다양한 장르 경험
- 퍼포먼스 능력`,
      [Profession.PLANNER]: `
- 전략적 사고 능력
- 프로젝트 성과
- 문서 작성 역량
- 프레젠테이션 능력
- 이해관계자 관리`,
      [Profession.RESEARCHER]: `
- 연구 방법론
- 연구 성과와 기여
- 학술적 글쓰기
- 데이터 분석 능력
- 발표와 커뮤니케이션`,
      [Profession.CONSULTANT]: `
- 문제 해결 능력
- 프로젝트 성과
- 산업 전문성
- 프레젠테이션 능력
- 클라이언트 관리`,
      [Profession.EDUCATOR]: `
- 교육 방법론
- 학습 성과
- 콘텐츠 품질
- 학습자 피드백
- 기술 활용 능력`,
      [Profession.OTHER]: `
- 프로젝트 완성도
- 전문성 표현
- 성과와 임팩트
- 커뮤니케이션 능력
- 포트폴리오 구성`,
    };

    return criteria[profession || Profession.OTHER];
  }

  // AI 면접 질문 생성
  async generateInterviewQuestions(dto: AiEvaluateDto): Promise<{ questions: Array<{ question: string; hint: string; category: string }>; tokensUsed: number }> {
    this.checkApiKey();

    const professionLabel = dto.profession ? ProfessionLabels[dto.profession] : '전문가';
    const categoryLabel = dto.category ? ProjectCategoryLabels[dto.category] : '프로젝트';

    const portfolioText = `
# ${dto.title}

${dto.summary ? `## 요약\n${dto.summary}\n` : ''}

## 직종
${professionLabel}

## 프로젝트 유형
${categoryLabel}

## 스킬/도구
${dto.skills?.join(', ') || dto.techStack?.join(', ') || '명시되지 않음'}

## 내용
${dto.content}
`.trim();

    const prompt = `다음 ${professionLabel}의 포트폴리오를 분석하고, 실제 면접에서 받을 수 있는 질문 10개를 생성해주세요.

${portfolioText}

각 질문에 대해:
1. 실제 면접관이 물어볼 법한 구체적인 질문
2. 답변할 때 참고할 수 있는 힌트
3. 질문 카테고리 (기술적 질문, 문제해결, 협업, 의사결정, 성과, 성장 등)

다음 JSON 형식으로 반환해주세요:
{
  "questions": [
    {
      "question": "면접 질문",
      "hint": "답변 힌트",
      "category": "카테고리"
    }
  ]
}

반드시 유효한 JSON만 반환하세요. 다른 텍스트는 포함하지 마세요.`;

    try {
      const systemPrompt = this.getSystemPromptByProfession(dto.profession);
      const response = await this.openai!.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt} 면접관 관점에서 깊이 있는 질문을 생성합니다. 반드시 JSON 형식으로만 응답하세요.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const tokensUsed = response.usage?.total_tokens || 0;

      try {
        const result = JSON.parse(content);
        return { ...result, tokensUsed };
      } catch {
        this.logger.error('Failed to parse AI response:', content);
        throw new BadRequestException('AI 응답 파싱에 실패했습니다.');
      }
    } catch (error: any) {
      this.logger.error('OpenAI API error:', error?.message || error);
      if (error?.response) {
        this.logger.error('Error response:', JSON.stringify(error.response.data || error.response));
      }
      throw new BadRequestException(`AI 처리 중 오류: ${error?.message || 'Unknown error'}`);
    }
  }

  isEnabled(): boolean {
    return this.openai !== null;
  }
}
