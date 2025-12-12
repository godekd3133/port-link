import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { postService, uploadService } from '../services';
import MarkdownEditor from '../components/MarkdownEditor';
import './PostForm.css';

const PostEdit = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    techStack: '',
    demoUrl: '',
    repositoryUrl: '',
    coverImage: '',
  });
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [newMediaFiles, setNewMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      const post = await postService.getPost(id);

      // Check if user is the author
      if (!user || user.id !== post.author.id) {
        navigate(`/posts/${id}`);
        return;
      }

      setFormData({
        title: post.title || '',
        summary: post.summary || '',
        content: post.content || '',
        techStack: post.techStack?.join(', ') || '',
        demoUrl: post.demoUrl || '',
        repositoryUrl: post.repositoryUrl || '',
        coverImage: post.coverImage || '',
      });

      if (post.media && post.media.length > 0) {
        setMediaPreviews(post.media.map(url => ({
          url,
          type: url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image',
          name: 'existing'
        })));
      }
    } catch (error) {
      console.error('Failed to load post:', error);
      setError('게시물을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 10 * 1024 * 1024;
      return (isImage || isVideo) && isValidSize;
    });

    // Track new files for upload
    setNewMediaFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, {
          url: e.target.result,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name,
          isNew: true
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index) => {
    const preview = mediaPreviews[index];
    if (preview?.isNew) {
      // Remove from newMediaFiles as well
      const newFileIndex = newMediaFiles.findIndex(f => f.name === preview.name);
      if (newFileIndex !== -1) {
        setNewMediaFiles(prev => prev.filter((_, i) => i !== newFileIndex));
      }
    }
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
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

    setSaving(true);

    try {
      // Collect existing media URLs (not base64)
      const existingUrls = mediaPreviews
        .filter(p => !p.isNew)
        .map(p => p.url);

      // Upload new files to S3
      const newUrls = [];
      for (const file of newMediaFiles) {
        try {
          const result = await uploadService.uploadFile(file);
          newUrls.push(result.url);
        } catch (err) {
          console.error('Failed to upload file:', file.name, err);
        }
      }

      const mediaUrls = [...existingUrls, ...newUrls];

      const data = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        summary: formData.summary.trim() || undefined,
        techStack: formData.techStack ? formData.techStack.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        demoUrl: formData.demoUrl.trim() || undefined,
        repositoryUrl: formData.repositoryUrl.trim() || undefined,
        coverImage: formData.coverImage.trim() || (mediaUrls[0] || undefined),
        media: mediaUrls.length > 0 ? mediaUrls : undefined,
        status: publish ? 'PUBLISHED' : 'DRAFT',
      };

      await postService.updatePost(id, data);
      navigate(`/posts/${id}`);
    } catch (err) {
      const message = err.response?.data?.message || '게시물 수정에 실패했습니다.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="post-form-container">
        <div className="post-loading">
          <div className="spinner"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="post-form-container">
      <div className="post-form-header">
        <p className="eyebrow">게시물 수정</p>
        <h1>포트폴리오 편집</h1>
        <p>내용을 수정하고 저장하세요</p>
      </div>

      <form className="post-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-group">
          <label>
            제목 <span className="required">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="프로젝트 제목을 입력하세요"
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label>
            요약 <span className="optional">(선택)</span>
          </label>
          <textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            rows={2}
            placeholder="프로젝트에 대한 간단한 설명"
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
            placeholder="마크다운으로 프로젝트를 소개해주세요..."
            title={formData.title}
            techStack={formData.techStack ? formData.techStack.split(',').map(t => t.trim()).filter(Boolean) : []}
          />
        </div>

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
              📷 사진/동영상 추가
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
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">
            <span>🛠</span> 프로젝트 정보
          </h3>

          <div className="form-group">
            <label>기술 스택 (쉼표로 구분)</label>
            <input
              type="text"
              value={formData.techStack}
              onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
              placeholder="React, Node.js, PostgreSQL"
            />
            {formData.techStack && (
              <div className="tech-stack-preview">
                {formData.techStack.split(',').map((tech, idx) =>
                  tech.trim() && (
                    <span key={idx} className="tech-preview-tag">{tech.trim()}</span>
                  )
                )}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>데모 URL</label>
              <input
                type="url"
                value={formData.demoUrl}
                onChange={(e) => setFormData({ ...formData, demoUrl: e.target.value })}
                placeholder="https://demo.example.com"
              />
            </div>

            <div className="form-group">
              <label>저장소 URL</label>
              <input
                type="url"
                value={formData.repositoryUrl}
                onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
                placeholder="https://github.com/user/repo"
              />
            </div>
          </div>

          <div className="form-group">
            <label>커버 이미지 URL</label>
            <input
              type="url"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              placeholder="https://example.com/cover.jpg"
            />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate(`/posts/${id}`)}
            className="btn btn-secondary"
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="btn btn-secondary"
            disabled={saving}
          >
            {saving ? '저장 중...' : '📝 임시저장'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? '저장 중...' : '🚀 발행하기'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostEdit;
