import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileService, postService } from '../services';
import './Profile.css';

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  // Quick post state
  const [showQuickPost, setShowQuickPost] = useState(false);
  const [quickPostData, setQuickPostData] = useState({ title: '', content: '' });
  const [quickPostMedia, setQuickPostMedia] = useState([]);
  const [quickPostLoading, setQuickPostLoading] = useState(false);
  const [quickPostError, setQuickPostError] = useState('');

  const isOwnProfile = currentUser && currentUser.id === userId;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await profileService.getProfile(userId);
      setProfile(profileData);

      // Posts are nested inside user object from backend
      if (profileData.user?.posts) {
        setPosts(profileData.user.posts);
      } else if (profileData.posts) {
        setPosts(profileData.posts);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quick Post Handlers
  const handleQuickMediaSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size <= 10 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setQuickPostMedia(prev => [...prev, {
            url: e.target.result,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            name: file.name
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeQuickMedia = (index) => {
    setQuickPostMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickPost = async () => {
    if (!quickPostData.title.trim() || !quickPostData.content.trim()) {
      setQuickPostError('제목과 내용을 입력해주세요.');
      return;
    }

    setQuickPostLoading(true);
    setQuickPostError('');

    try {
      const mediaUrls = quickPostMedia.map(m => m.url);
      const data = {
        title: quickPostData.title.trim(),
        content: quickPostData.content.trim(),
        media: mediaUrls.length > 0 ? mediaUrls : undefined,
        coverImage: quickPostMedia[0]?.url || undefined,
        status: 'PUBLISHED',
      };

      const post = await postService.createPost(data);

      // Reset form
      setQuickPostData({ title: '', content: '' });
      setQuickPostMedia([]);
      setShowQuickPost(false);

      // Navigate to new post or reload
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setQuickPostError(err.response?.data?.message || '게시물 생성에 실패했습니다.');
    } finally {
      setQuickPostLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner" />
        <p>프로필을 불러오는 중...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-not-found">
        <div className="not-found-icon">🔍</div>
        <h2>프로필을 찾을 수 없습니다</h2>
        <p>요청하신 사용자 프로필이 존재하지 않습니다.</p>
        <Link to="/" className="btn btn-primary">홈으로 돌아가기</Link>
      </div>
    );
  }

  const stats = {
    posts: posts.length,
    views: posts.reduce((sum, post) => sum + (post.viewCount || 0), 0),
    likes: posts.reduce((sum, post) => sum + (post._count?.likes || post.likeCount || 0), 0),
  };

  return (
    <div className="profile">
      {/* Hero Section */}
      <div className="profile-hero">
        <div className="profile-hero-bg">
          <div className="hero-gradient" />
          <div className="hero-pattern" />
        </div>

        <div className="profile-card">
          <div className="profile-avatar">
            <span>{profile.name?.[0]?.toUpperCase() || 'U'}</span>
          </div>

          <div className="profile-info">
            <h1>{profile.name || '익명 사용자'}</h1>
            {profile.username && <p className="profile-username">@{profile.username}</p>}
            {profile.title && <p className="profile-title">{profile.title}</p>}
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}

            <div className="profile-meta">
              {profile.location && (
                <span className="meta-item">
                  <span className="meta-icon">📍</span>
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="meta-item link">
                  <span className="meta-icon">🔗</span>
                  웹사이트
                </a>
              )}
              {profile.github && (
                <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" className="meta-item link">
                  <span className="meta-icon">💻</span>
                  GitHub
                </a>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <Link to="/settings/profile" className="btn btn-secondary profile-edit-btn">
              프로필 수정
            </Link>
          )}
        </div>

        <div className="profile-stats">
          <div className="stat">
            <span className="stat-value">{stats.posts}</span>
            <span className="stat-label">게시물</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.views.toLocaleString()}</span>
            <span className="stat-label">총 조회수</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.likes.toLocaleString()}</span>
            <span className="stat-label">받은 좋아요</span>
          </div>
        </div>
      </div>

      {/* Quick Post Section - Only for own profile */}
      {isOwnProfile && (
        <div className="quick-post-section">
          {!showQuickPost ? (
            <button
              className="quick-post-trigger"
              onClick={() => setShowQuickPost(true)}
            >
              <div className="trigger-avatar">
                <span>{profile.name?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <span className="trigger-text">새 프로젝트를 공유해보세요...</span>
              <div className="trigger-icons">
                <span>📷</span>
                <span>🎬</span>
              </div>
            </button>
          ) : (
            <div className="quick-post-form">
              <div className="quick-post-header">
                <h3>새 게시물</h3>
                <button className="close-btn" onClick={() => setShowQuickPost(false)}>×</button>
              </div>

              <input
                type="text"
                placeholder="제목을 입력하세요"
                value={quickPostData.title}
                onChange={(e) => setQuickPostData({ ...quickPostData, title: e.target.value })}
                className="quick-post-title"
              />

              <textarea
                placeholder="프로젝트에 대해 설명해주세요..."
                value={quickPostData.content}
                onChange={(e) => setQuickPostData({ ...quickPostData, content: e.target.value })}
                rows={4}
                className="quick-post-content"
              />

              {/* Media Preview */}
              {quickPostMedia.length > 0 && (
                <div className="quick-post-media-grid">
                  {quickPostMedia.map((media, index) => (
                    <div key={index} className="quick-media-item">
                      {media.type === 'video' ? (
                        <video src={media.url} controls />
                      ) : (
                        <img src={media.url} alt={media.name} />
                      )}
                      <button className="remove-btn" onClick={() => removeQuickMedia(index)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="quick-post-footer">
                <div className="quick-post-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleQuickMediaSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="media-add-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📷 사진/동영상
                  </button>
                  <Link to="/posts/create" className="expand-btn">
                    📝 상세 작성
                  </Link>
                </div>

                {quickPostError && <p className="quick-post-error">{quickPostError}</p>}

                <button
                  className="btn btn-primary"
                  onClick={handleQuickPost}
                  disabled={quickPostLoading}
                >
                  {quickPostLoading ? '발행 중...' : '발행하기'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skills Section */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="profile-section">
          <h3 className="section-title">
            <span>🛠️</span> 기술 스택
          </h3>
          <div className="skills-grid">
            {profile.skills.map((skill, idx) => (
              <span key={idx} className="skill-tag">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <span>📝</span> 게시물 ({posts.length})
        </button>
        <button
          className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <span>⚡</span> 활동
        </button>
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="profile-posts">
          {posts.length > 0 ? (
            <div className="posts-grid">
              {posts.map((post) => (
                <Link key={post.id} to={`/posts/${post.id}`} className="post-card">
                  {(post.coverImage || post.media?.[0]) && (
                    <div className="post-thumbnail">
                      <img src={post.coverImage || post.media?.[0]} alt={post.title} />
                    </div>
                  )}
                  <div className="post-content">
                    <div className="post-status">
                      <span className={`status-badge ${post.status?.toLowerCase()}`}>
                        {post.status === 'PUBLISHED' ? '공개' : '임시저장'}
                      </span>
                    </div>
                    <h3>{post.title}</h3>
                    <p className="post-summary">{post.summary || '설명이 없습니다.'}</p>
                    <div className="post-meta">
                      <span>👁️ {post.viewCount || 0}</span>
                      <span>❤️ {post._count?.likes || post.likeCount || 0}</span>
                      <span>💬 {post._count?.comments || post.commentCount || 0}</span>
                    </div>
                    {post.techStack && post.techStack.length > 0 && (
                      <div className="post-tech">
                        {post.techStack.slice(0, 3).map((tech, idx) => (
                          <span key={idx} className="tech-tag">{tech}</span>
                        ))}
                        {post.techStack.length > 3 && (
                          <span className="tech-more">+{post.techStack.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h4>아직 게시물이 없습니다</h4>
              <p>{isOwnProfile ? '첫 번째 프로젝트를 공유해보세요!' : '이 사용자는 아직 게시물이 없습니다.'}</p>
              {isOwnProfile && (
                <Link to="/posts/create" className="btn btn-primary">글 작성하기</Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="profile-activity">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h4>활동 내역</h4>
            <p>최근 활동 내역이 여기에 표시됩니다.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
