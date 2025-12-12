import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services';
import './ProfileSettings.css';

// 직종 목록
const PROFESSIONS = [
  { value: '', label: '선택하세요' },
  { value: 'DEVELOPER', label: '개발자' },
  { value: 'DESIGNER', label: '디자이너' },
  { value: 'PM', label: 'PM / 기획자' },
  { value: 'MARKETER', label: '마케터' },
  { value: 'DATA_ANALYST', label: '데이터 분석가' },
  { value: 'CONTENT_CREATOR', label: '콘텐츠 크리에이터' },
  { value: 'WRITER', label: '작가' },
  { value: 'PHOTOGRAPHER', label: '사진작가' },
  { value: 'VIDEO_CREATOR', label: '영상 제작자' },
  { value: 'MUSICIAN', label: '음악가' },
  { value: 'PLANNER', label: '기획자' },
  { value: 'RESEARCHER', label: '연구원' },
  { value: 'CONSULTANT', label: '컨설턴트' },
  { value: 'EDUCATOR', label: '교육자' },
  { value: 'OTHER', label: '기타' },
];

// 직종별 추천 스킬
const SUGGESTED_SKILLS = {
  DEVELOPER: ['JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Docker', 'AWS', 'Git'],
  DESIGNER: ['Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'UI/UX', 'Prototyping'],
  PM: ['Jira', 'Notion', 'Asana', 'PRD 작성', 'A/B Testing', 'SQL', '데이터 분석'],
  MARKETER: ['Google Analytics', 'SEO', 'Content Marketing', 'SNS 마케팅', '광고 운영'],
  DATA_ANALYST: ['Python', 'SQL', 'Tableau', 'Power BI', 'Excel', '통계분석', 'Machine Learning'],
  CONTENT_CREATOR: ['Premiere Pro', 'Final Cut', 'YouTube', 'TikTok', '스토리텔링'],
  WRITER: ['카피라이팅', '콘텐츠 기획', 'SEO Writing', '기술 문서 작성'],
  PHOTOGRAPHER: ['Lightroom', 'Photoshop', '인물 사진', '제품 촬영', '후보정'],
  VIDEO_CREATOR: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', '컬러 그레이딩'],
  MUSICIAN: ['Ableton Live', 'Logic Pro', 'Pro Tools', 'Mixing', 'Mastering'],
  PLANNER: ['전략 기획', '사업 기획', '프레젠테이션', '리서치'],
  RESEARCHER: ['연구 방법론', '논문 작성', '데이터 분석', 'SPSS', 'R'],
  CONSULTANT: ['컨설팅', '문제 해결', '프레젠테이션', '산업 분석'],
  EDUCATOR: ['강의 설계', '콘텐츠 제작', 'LMS', '교육 커리큘럼'],
  OTHER: [],
};

const ProfileSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    title: '',
    bio: '',
    location: '',
    websiteUrl: '',
    githubUrl: '',
    skills: '',
    // 새 필드들
    profession: '',
    secondaryProfession: '',
    yearsOfExperience: '',
    isOpenToWork: false,
    isOpenToCollaborate: false,
    // 소셜 링크
    behanceUrl: '',
    dribbbleUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    twitterUrl: '',
    notionUrl: '',
    linkedinUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await profileService.getProfile(user.id);
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
        title: profile.title || '',
        bio: profile.bio || '',
        location: profile.location || '',
        websiteUrl: profile.websiteUrl || '',
        githubUrl: profile.githubUrl || '',
        skills: profile.skills?.join(', ') || '',
        // 새 필드들
        profession: profile.profession || '',
        secondaryProfession: profile.secondaryProfession || '',
        yearsOfExperience: profile.yearsOfExperience?.toString() || '',
        isOpenToWork: profile.isOpenToWork || false,
        isOpenToCollaborate: profile.isOpenToCollaborate || false,
        // 소셜 링크
        behanceUrl: profile.behanceUrl || '',
        dribbbleUrl: profile.dribbbleUrl || '',
        instagramUrl: profile.instagramUrl || '',
        youtubeUrl: profile.youtubeUrl || '',
        twitterUrl: profile.twitterUrl || '',
        notionUrl: profile.notionUrl || '',
        linkedinUrl: profile.linkedinUrl || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('프로필을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const data = {
        name: formData.name.trim() || undefined,
        username: formData.username.trim() || undefined,
        title: formData.title.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        location: formData.location.trim() || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        githubUrl: formData.githubUrl.trim() || undefined,
        skills: formData.skills
          ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        // 새 필드들
        profession: formData.profession || undefined,
        secondaryProfession: formData.secondaryProfession || undefined,
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience, 10) : undefined,
        isOpenToWork: formData.isOpenToWork,
        isOpenToCollaborate: formData.isOpenToCollaborate,
        // 소셜 링크
        behanceUrl: formData.behanceUrl.trim() || undefined,
        dribbbleUrl: formData.dribbbleUrl.trim() || undefined,
        instagramUrl: formData.instagramUrl.trim() || undefined,
        youtubeUrl: formData.youtubeUrl.trim() || undefined,
        twitterUrl: formData.twitterUrl.trim() || undefined,
        notionUrl: formData.notionUrl.trim() || undefined,
        linkedinUrl: formData.linkedinUrl.trim() || undefined,
      };

      await profileService.updateProfile(data);
      setSuccess('프로필이 저장되었습니다.');

      // 3초 후 성공 메시지 숨기기
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const message = err.response?.data?.message || '프로필 저장에 실패했습니다.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [field]: value });
  };

  const addSuggestedSkill = (skill) => {
    const currentSkills = formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!currentSkills.includes(skill)) {
      setFormData({
        ...formData,
        skills: [...currentSkills, skill].join(', ')
      });
    }
  };

  const suggestedSkills = SUGGESTED_SKILLS[formData.profession] || [];

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner" />
        <p>프로필을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="settings-shell">
      <div className="settings-container">
        <div className="settings-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <span>←</span> 뒤로
          </button>
          <div>
            <p className="eyebrow">Settings</p>
            <h1>프로필 수정</h1>
          </div>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          {/* 기본 정보 섹션 */}
          <div className="settings-section">
            <h2>기본 정보</h2>

            <div className="form-group">
              <label>이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="이름을 입력하세요"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>사용자명</label>
              <div className="username-input-wrapper">
                <span className="username-prefix">@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                    setFormData({ ...formData, username: value });
                  }}
                  placeholder="username"
                  maxLength={30}
                />
              </div>
              <small className="field-hint">영문, 숫자, 밑줄(_), 점(.)만 사용 가능</small>
            </div>

            <div className="form-group">
              <label>직함 / 역할</label>
              <input
                type="text"
                value={formData.title}
                onChange={handleChange('title')}
                placeholder="예: 프론트엔드 개발자, 그래픽 디자이너, 영상 크리에이터"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>자기소개</label>
              <textarea
                value={formData.bio}
                onChange={handleChange('bio')}
                placeholder="자신을 소개해주세요"
                rows={4}
                maxLength={500}
              />
              <small className="field-hint">{formData.bio.length}/500</small>
            </div>
          </div>

          {/* 직종 및 경력 섹션 */}
          <div className="settings-section">
            <h2>직종 및 경력</h2>

            <div className="form-row">
              <div className="form-group">
                <label>주 직종</label>
                <select
                  value={formData.profession}
                  onChange={handleChange('profession')}
                  className="form-select"
                >
                  {PROFESSIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>부 직종 (선택)</label>
                <select
                  value={formData.secondaryProfession}
                  onChange={handleChange('secondaryProfession')}
                  className="form-select"
                >
                  {PROFESSIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>경력 (년)</label>
              <input
                type="number"
                value={formData.yearsOfExperience}
                onChange={handleChange('yearsOfExperience')}
                placeholder="예: 3"
                min="0"
                max="50"
              />
            </div>
          </div>

          {/* 활동 상태 섹션 */}
          <div className="settings-section">
            <h2>활동 상태</h2>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isOpenToWork}
                  onChange={handleChange('isOpenToWork')}
                />
                <span className="checkbox-text">
                  <strong>구직 중</strong>
                  <small>채용 담당자에게 구직 중임을 표시합니다</small>
                </span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isOpenToCollaborate}
                  onChange={handleChange('isOpenToCollaborate')}
                />
                <span className="checkbox-text">
                  <strong>협업 제안 받기</strong>
                  <small>다른 사용자로부터 협업 요청을 받을 수 있습니다</small>
                </span>
              </label>
            </div>
          </div>

          {/* 연락처 및 링크 섹션 */}
          <div className="settings-section">
            <h2>연락처 및 링크</h2>

            <div className="form-group">
              <label>위치</label>
              <input
                type="text"
                value={formData.location}
                onChange={handleChange('location')}
                placeholder="예: 서울, 대한민국"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>웹사이트</label>
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={handleChange('websiteUrl')}
                placeholder="https://your-website.com"
              />
            </div>

            <div className="form-group">
              <label>GitHub</label>
              <div className="github-input-wrapper">
                <span className="github-prefix">github.com/</span>
                <input
                  type="text"
                  value={formData.githubUrl}
                  onChange={handleChange('githubUrl')}
                  placeholder="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label>LinkedIn</label>
              <input
                type="url"
                value={formData.linkedinUrl}
                onChange={handleChange('linkedinUrl')}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>

          {/* 크리에이티브 링크 섹션 */}
          <div className="settings-section">
            <h2>크리에이티브 포트폴리오</h2>
            <small className="section-hint">작업물이 있는 외부 플랫폼을 연결하세요</small>

            <div className="form-row">
              <div className="form-group">
                <label>Behance</label>
                <input
                  type="url"
                  value={formData.behanceUrl}
                  onChange={handleChange('behanceUrl')}
                  placeholder="https://behance.net/username"
                />
              </div>

              <div className="form-group">
                <label>Dribbble</label>
                <input
                  type="url"
                  value={formData.dribbbleUrl}
                  onChange={handleChange('dribbbleUrl')}
                  placeholder="https://dribbble.com/username"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>YouTube</label>
                <input
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={handleChange('youtubeUrl')}
                  placeholder="https://youtube.com/@channel"
                />
              </div>

              <div className="form-group">
                <label>Instagram</label>
                <input
                  type="url"
                  value={formData.instagramUrl}
                  onChange={handleChange('instagramUrl')}
                  placeholder="https://instagram.com/username"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Twitter / X</label>
                <input
                  type="url"
                  value={formData.twitterUrl}
                  onChange={handleChange('twitterUrl')}
                  placeholder="https://twitter.com/username"
                />
              </div>

              <div className="form-group">
                <label>Notion</label>
                <input
                  type="url"
                  value={formData.notionUrl}
                  onChange={handleChange('notionUrl')}
                  placeholder="https://notion.so/username"
                />
              </div>
            </div>
          </div>

          {/* 스킬 섹션 */}
          <div className="settings-section">
            <h2>스킬 및 전문분야</h2>

            <div className="form-group">
              <label>스킬 (쉼표로 구분)</label>
              <input
                type="text"
                value={formData.skills}
                onChange={handleChange('skills')}
                placeholder="예: React, Figma, Premiere Pro, 사진촬영"
              />
              {formData.skills && (
                <div className="skills-preview">
                  {formData.skills.split(',').map((skill, idx) =>
                    skill.trim() && (
                      <span key={idx} className="skill-tag">{skill.trim()}</span>
                    )
                  )}
                </div>
              )}
            </div>

            {/* 추천 스킬 */}
            {suggestedSkills.length > 0 && (
              <div className="suggested-skills">
                <label>추천 스킬 (클릭하여 추가)</label>
                <div className="suggested-skills-list">
                  {suggestedSkills.map((skill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggested-skill-btn"
                      onClick={() => addSuggestedSkill(skill)}
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 메시지 */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* 액션 버튼 */}
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/profile/${user.id}`)}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
