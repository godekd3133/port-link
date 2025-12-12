import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { postService } from '../services';
import MarkdownEditor from '../components/MarkdownEditor';
import './PostForm.css';

// 프로젝트 카테고리
const PROJECT_CATEGORIES = [
  { value: '', label: '카테고리 선택' },
  { value: 'WEB_APP', label: '웹 앱' },
  { value: 'MOBILE_APP', label: '모바일 앱' },
  { value: 'DESIGN', label: '디자인' },
  { value: 'BRANDING', label: '브랜딩' },
  { value: 'MARKETING', label: '마케팅' },
  { value: 'VIDEO', label: '영상' },
  { value: 'PHOTOGRAPHY', label: '사진' },
  { value: 'MUSIC', label: '음악' },
  { value: 'WRITING', label: '글/콘텐츠' },
  { value: 'RESEARCH', label: '연구' },
  { value: 'DATA_ANALYSIS', label: '데이터 분석' },
  { value: 'CASE_STUDY', label: '케이스 스터디' },
  { value: 'PRESENTATION', label: '프레젠테이션' },
  { value: 'GAME', label: '게임' },
  { value: 'HARDWARE', label: '하드웨어/IoT' },
  { value: 'OTHER', label: '기타' },
];

const PostCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    techStack: '',
    skills: '',
    category: '',
    demoUrl: '',
    repositoryUrl: '',
    coverImage: '',
    // 새 필드들
    isTeamProject: false,
    projectStartDate: '',
    projectEndDate: '',
    behanceUrl: '',
    figmaUrl: '',
    youtubeUrl: '',
    externalUrl: '',
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return (isImage || isVideo) && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError('일부 파일이 제외되었습니다. (이미지/동영상만, 최대 10MB)');
    }

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, {
          url: e.target.result,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });

    setMediaFiles(prev => [...prev, ...validFiles]);
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async () => {
    // For now, we'll use data URLs as placeholders
    // In production, this would upload to S3
    const urls = mediaPreviews.map(p => p.url);
    return urls;
  };

  const handleSubmit = async (publish = false) => {
    setError('');

    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!formData.content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      // Upload media files first
      const mediaUrls = await uploadMedia();

      const data = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        summary: formData.summary.trim() || undefined,
        category: formData.category || undefined,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        techStack: formData.techStack ? formData.techStack.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        demoUrl: formData.demoUrl.trim() || undefined,
        repositoryUrl: formData.repositoryUrl.trim() || undefined,
        coverImage: formData.coverImage.trim() || (mediaUrls[0] || undefined),
        media: mediaUrls.length > 0 ? mediaUrls : undefined,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        // 새 필드들
        isTeamProject: formData.isTeamProject,
        projectStartDate: formData.projectStartDate || undefined,
        projectEndDate: formData.projectEndDate || undefined,
        behanceUrl: formData.behanceUrl.trim() || undefined,
        figmaUrl: formData.figmaUrl.trim() || undefined,
        youtubeUrl: formData.youtubeUrl.trim() || undefined,
        externalUrl: formData.externalUrl.trim() || undefined,
      };

      const post = await postService.createPost(data);
      navigate(`/posts/${post.id}`);
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.errors?.join(', ') || '게시물 생성에 실패했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="post-form-container">
      <div className="post-form-header">
        <p className="eyebrow">새 게시물</p>
        <h1>작업물 공유</h1>
        <p>당신의 작업을 세상에 보여주세요</p>
      </div>

      <form className="post-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-group">
          <label>
            제목 <span className="required">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={handleChange('title')}
            placeholder="제목을 입력하세요"
            maxLength={200}
          />
        </div>

        {/* 카테고리 선택 */}
        <div className="form-row">
          <div className="form-group">
            <label>프로젝트 카테고리</label>
            <select
              value={formData.category}
              onChange={handleChange('category')}
              className="form-select"
            >
              {PROJECT_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-inline">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isTeamProject}
                onChange={handleChange('isTeamProject')}
              />
              <span>팀 프로젝트</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>
            요약 <span className="optional">(선택)</span>
          </label>
          <textarea
            value={formData.summary}
            onChange={handleChange('summary')}
            rows={2}
            placeholder="한 줄 소개 (피드에 표시됩니다)"
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label>
            내용 <span className="required">*</span>
          </label>
          <MarkdownEditor
            value={formData.content}
            onChange={(value) => setFormData({ ...formData, content: value })}
            placeholder="작업에 대해 자유롭게 작성해주세요..."
            title={formData.title}
            techStack={formData.techStack ? formData.techStack.split(',').map(t => t.trim()).filter(Boolean) : []}
          />
          <p className="form-help">
            마크다운 문법을 사용할 수 있습니다.
          </p>
        </div>

        {/* Media Upload */}
        <div className="form-group">
          <label>사진/동영상</label>
          <div className="media-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleMediaSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-outline media-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              사진/동영상 추가
            </button>

            {mediaPreviews.length > 0 && (
              <div className="media-preview-grid">
                {mediaPreviews.map((media, index) => (
                  <div key={index} className="media-preview-item">
                    {media.type === 'video' ? (
                      <video src={media.url} controls />
                    ) : (
                      <img src={media.url} alt={media.name} />
                    )}
                    <button
                      type="button"
                      className="remove-media-btn"
                      onClick={() => removeMedia(index)}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 스킬/도구 */}
        <div className="form-group">
          <label>사용한 스킬/도구 (쉼표로 구분)</label>
          <input
            type="text"
            value={formData.skills}
            onChange={handleChange('skills')}
            placeholder="예: Figma, React, Premiere Pro, Lightroom..."
          />
          {formData.skills && (
            <div className="tech-stack-preview">
              {formData.skills.split(',').map((skill, idx) =>
                skill.trim() && (
                  <span key={idx} className="tech-preview-tag">{skill.trim()}</span>
                )
              )}
            </div>
          )}
        </div>

        {/* 프로젝트 기간 */}
        <div className="form-row">
          <div className="form-group">
            <label>프로젝트 시작일</label>
            <input
              type="date"
              value={formData.projectStartDate}
              onChange={handleChange('projectStartDate')}
            />
          </div>
          <div className="form-group">
            <label>프로젝트 종료일</label>
            <input
              type="date"
              value={formData.projectEndDate}
              onChange={handleChange('projectEndDate')}
            />
          </div>
        </div>

        {/* 고급 설정 토글 */}
        <button
          type="button"
          className="btn btn-link toggle-advanced"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '- 외부 링크 숨기기' : '+ 외부 링크 추가'}
        </button>

        {showAdvanced && (
          <div className="advanced-section">
            <div className="form-row">
              <div className="form-group">
                <label>데모 URL</label>
                <input
                  type="url"
                  value={formData.demoUrl}
                  onChange={handleChange('demoUrl')}
                  placeholder="https://demo.example.com"
                />
              </div>
              <div className="form-group">
                <label>저장소 URL (GitHub 등)</label>
                <input
                  type="url"
                  value={formData.repositoryUrl}
                  onChange={handleChange('repositoryUrl')}
                  placeholder="https://github.com/user/repo"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Behance</label>
                <input
                  type="url"
                  value={formData.behanceUrl}
                  onChange={handleChange('behanceUrl')}
                  placeholder="https://behance.net/gallery/..."
                />
              </div>
              <div className="form-group">
                <label>Figma</label>
                <input
                  type="url"
                  value={formData.figmaUrl}
                  onChange={handleChange('figmaUrl')}
                  placeholder="https://figma.com/file/..."
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
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="form-group">
                <label>기타 외부 링크</label>
                <input
                  type="url"
                  value={formData.externalUrl}
                  onChange={handleChange('externalUrl')}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading ? '저장 중...' : '임시저장'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '발행 중...' : '발행하기'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostCreate;
