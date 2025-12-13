import api from './api';

export const authService = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    // 회원가입 성공 시 토큰 저장 (자동 로그인)
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
    }
    return response.data;
  },

  login: async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.access_token) {
      // 자동 로그인 선택 시 localStorage, 아니면 sessionStorage
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', response.data.access_token);
      if (response.data.refresh_token) {
        storage.setItem('refresh_token', response.data.refresh_token);
      }
      // 자동 로그인 여부 저장
      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refresh_token');
  },

  // 저장된 토큰 가져오기 (localStorage 또는 sessionStorage)
  getToken: () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  },

  // 아이디 저장
  saveEmail: (email) => {
    localStorage.setItem('savedEmail', email);
  },

  getSavedEmail: () => {
    return localStorage.getItem('savedEmail') || '';
  },

  clearSavedEmail: () => {
    localStorage.removeItem('savedEmail');
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
};

export const postService = {
  getFeed: async (params) => {
    const response = await api.get('/feed', { params });
    return response.data;
  },

  getPost: async (id) => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  createPost: async (data) => {
    const response = await api.post('/posts', data);
    return response.data;
  },

  updatePost: async (id, data) => {
    const response = await api.patch(`/posts/${id}`, data);
    return response.data;
  },

  deletePost: async (id) => {
    await api.delete(`/posts/${id}`);
  },

  publishPost: async (id) => {
    const response = await api.patch(`/posts/${id}/publish`);
    return response.data;
  },
};

export const commentService = {
  getComments: async (postId) => {
    const response = await api.get(`/posts/${postId}/comments`);
    return response.data;
  },

  createComment: async (postId, content) => {
    const response = await api.post(`/posts/${postId}/comments`, { content });
    return response.data;
  },

  updateComment: async (postId, commentId, content) => {
    const response = await api.patch(`/posts/${postId}/comments/${commentId}`, { content });
    return response.data;
  },

  deleteComment: async (postId, commentId) => {
    await api.delete(`/posts/${postId}/comments/${commentId}`);
  },
};

export const likeService = {
  toggleLike: async (postId) => {
    const response = await api.post(`/posts/${postId}/likes/toggle`);
    return response.data;
  },

  checkLiked: async (postId) => {
    const response = await api.get(`/posts/${postId}/likes/check`);
    return response.data;
  },
};

export const bookmarkService = {
  toggleBookmark: async (postId) => {
    const response = await api.post(`/posts/${postId}/bookmarks/toggle`);
    return response.data;
  },

  getBookmarks: async () => {
    const response = await api.get('/bookmarks');
    return response.data;
  },
};

export const profileService = {
  getProfile: async (userId) => {
    const response = await api.get(`/profiles/${userId}`);
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.patch('/profiles', data);
    return response.data;
  },
};

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getPostStats: async (postId) => {
    const response = await api.get(`/dashboard/posts/${postId}/stats`);
    return response.data;
  },

  getEngagement: async () => {
    const response = await api.get('/dashboard/engagement');
    return response.data;
  },
};

export const uploadService = {
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getPresignedUrl: async (fileName, contentType) => {
    const response = await api.post('/upload/presigned-url', { fileName, contentType });
    return response.data;
  },
};

export const aiService = {
  // AI 상태 확인
  getStatus: async () => {
    const response = await api.get('/ai/status');
    return response.data;
  },

  // 글쓰기 도우미
  assistWriting: async (content, action, context = {}) => {
    const response = await api.post('/ai/writing/assist', {
      content,
      action,
      title: context.title,
      techStack: context.techStack,
    });
    return response.data;
  },

  // 포트폴리오 평가
  evaluatePortfolio: async (portfolio) => {
    const response = await api.post('/ai/evaluate', portfolio);
    return response.data;
  },

  // 면접 질문 생성
  generateInterviewQuestions: async (portfolio) => {
    const response = await api.post('/ai/interview-questions', portfolio);
    return response.data;
  },
};

export const collaborationService = {
  // 협업 요청 생성
  createRequest: async (data) => {
    const response = await api.post('/collaborations/request', data);
    return response.data;
  },

  // 받은 협업 요청 목록
  getReceivedRequests: async () => {
    const response = await api.get('/collaborations/requests/received');
    return response.data;
  },

  // 보낸 협업 요청 목록
  getSentRequests: async () => {
    const response = await api.get('/collaborations/requests/sent');
    return response.data;
  },

  // 협업 요청 응답 (수락/거절)
  respondToRequest: async (requestId, data) => {
    const response = await api.patch(`/collaborations/request/${requestId}/respond`, data);
    return response.data;
  },

  // 협업 요청 취소
  cancelRequest: async (requestId) => {
    const response = await api.delete(`/collaborations/request/${requestId}`);
    return response.data;
  },

  // 협업 가능한 사용자 검색
  searchUsers: async (params) => {
    const response = await api.get('/collaborations/users/search', { params });
    return response.data;
  },

  // 협업 통계
  getStats: async () => {
    const response = await api.get('/collaborations/stats');
    return response.data;
  },
};

// 포트폴리오 코치 서비스
export const portfolioCoachService = {
  // 프로필 완성도 조회
  getCompleteness: async () => {
    const response = await api.get('/portfolio-coach/completeness');
    return response.data;
  },

  // AI 프로필 분석
  analyzeProfile: async () => {
    const response = await api.get('/portfolio-coach/analyze');
    return response.data;
  },

  // 이력서 내보내기
  exportResume: async () => {
    const response = await api.get('/portfolio-coach/export-resume');
    return response.data;
  },
};

// 추천/보증 서비스
export const endorsementService = {
  // 스킬 추천하기
  endorseSkill: async (data) => {
    const response = await api.post('/endorsements/skills', data);
    return response.data;
  },

  // 스킬 추천 취소
  removeEndorsement: async (id) => {
    const response = await api.delete(`/endorsements/skills/${id}`);
    return response.data;
  },

  // 사용자의 스킬 추천 목록
  getSkillEndorsements: async (userId) => {
    const response = await api.get(`/endorsements/skills/user/${userId}`);
    return response.data;
  },

  // 내가 한 추천 목록
  getMyEndorsements: async () => {
    const response = await api.get('/endorsements/skills/my-endorsements');
    return response.data;
  },

  // 추천서 작성
  createRecommendation: async (data) => {
    const response = await api.post('/endorsements/recommendations', data);
    return response.data;
  },

  // 추천서 수정
  updateRecommendation: async (id, data) => {
    const response = await api.patch(`/endorsements/recommendations/${id}`, data);
    return response.data;
  },

  // 추천서 삭제
  deleteRecommendation: async (id) => {
    const response = await api.delete(`/endorsements/recommendations/${id}`);
    return response.data;
  },

  // 사용자의 추천서 목록 (공개)
  getRecommendations: async (userId) => {
    const response = await api.get(`/endorsements/recommendations/user/${userId}`);
    return response.data;
  },

  // 내가 받은 추천서 (비공개 포함)
  getMyRecommendations: async () => {
    const response = await api.get('/endorsements/recommendations/received');
    return response.data;
  },

  // 추천서 승인
  verifyRecommendation: async (id) => {
    const response = await api.patch(`/endorsements/recommendations/${id}/verify`);
    return response.data;
  },

  // 추천서 공개/비공개 설정
  setVisibility: async (id, isPublic) => {
    const response = await api.patch(`/endorsements/recommendations/${id}/visibility`, { isPublic });
    return response.data;
  },
};

// 매칭 서비스
export const matchingService = {
  // 협업자 추천
  findCollaborators: async (params) => {
    const response = await api.get('/matching/collaborators', { params });
    return response.data;
  },

  // 프로젝트 팀 추천
  recommendTeam: async (data) => {
    const response = await api.post('/matching/team-recommendation', data);
    return response.data;
  },

  // 비슷한 프로필 찾기
  findSimilarProfiles: async (limit) => {
    const response = await api.get('/matching/similar-profiles', { params: { limit } });
    return response.data;
  },

  // 멘토 찾기
  findMentors: async (skill, limit) => {
    const response = await api.get('/matching/mentors', { params: { skill, limit } });
    return response.data;
  },
};

// 분석/임팩트 서비스
export const analyticsService = {
  // 프로젝트 타임라인
  getTimeline: async () => {
    const response = await api.get('/analytics/timeline');
    return response.data;
  },

  // 사용자 타임라인 (공개)
  getUserTimeline: async (userId) => {
    const response = await api.get(`/analytics/timeline/${userId}`);
    return response.data;
  },

  // 임팩트 메트릭스
  getImpactMetrics: async () => {
    const response = await api.get('/analytics/impact');
    return response.data;
  },

  // 포스트 분석
  getPostAnalytics: async (postId) => {
    const response = await api.get(`/analytics/posts/${postId}`);
    return response.data;
  },

  // 스킬별 분포
  getSkillDistribution: async () => {
    const response = await api.get('/analytics/skills');
    return response.data;
  },
};

// GitHub 연동 서비스
export const githubService = {
  // OAuth URL 가져오기
  getOAuthUrl: async () => {
    const response = await api.get('/github/oauth-url');
    return response.data;
  },

  // 연동 상태 확인
  getStatus: async () => {
    const response = await api.get('/github/status');
    return response.data;
  },

  // 연동 해제
  disconnect: async () => {
    const response = await api.delete('/github/disconnect');
    return response.data;
  },

  // 레포지토리 목록
  listRepositories: async () => {
    const response = await api.get('/github/repositories');
    return response.data;
  },

  // 레포지토리 가져오기
  importRepository: async (data) => {
    const response = await api.post('/github/import', data);
    return response.data;
  },

  // 자동 동기화 설정
  setAutoSync: async (enabled, settings) => {
    const response = await api.post('/github/auto-sync', { enabled, settings });
    return response.data;
  },
};

// 커리어 인사이트 서비스
export const insightsService = {
  // 커리어 인사이트
  getCareerInsights: async () => {
    const response = await api.get('/insights/career');
    return response.data;
  },

  // 스킬 트렌드
  getSkillTrends: async (profession) => {
    const response = await api.get('/insights/skill-trends', { params: { profession } });
    return response.data;
  },
};
