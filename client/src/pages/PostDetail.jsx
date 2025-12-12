import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { postService, commentService, likeService } from '../services';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import AIFeedbackModal from '../components/AIFeedbackModal';
import './PostDetail.css';

const PostDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent double fetch in StrictMode (view count increment)
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadPost();
    loadComments();
    if (user) {
      checkLiked();
    }
  }, [id, user]);

  const loadPost = async () => {
    try {
      const data = await postService.getPost(id);
      setPost(data);
    } catch (error) {
      console.error('Failed to load post:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await commentService.getComments(id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const checkLiked = async () => {
    try {
      const data = await likeService.checkLiked(id);
      setLiked(data.liked);
    } catch (error) {
      console.error('Failed to check liked:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      const data = await likeService.toggleLike(id);
      setLiked(data.liked);
      loadPost(); // Reload to update like count
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      await commentService.createComment(id, newComment);
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await postService.deletePost(id);
        navigate('/');
      } catch (error) {
        console.error('Failed to delete post:', error);
      }
    }
  };

  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: '1.5rem 0',
          borderRadius: '12px',
          fontSize: '0.9rem',
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const estimateReadTime = (content) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return minutes;
  };

  if (loading) {
    return (
      <div className="post-loading">
        <div className="spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-not-found">
        <div className="not-found-icon">📭</div>
        <h2>게시물을 찾을 수 없습니다</h2>
        <p>삭제되었거나 존재하지 않는 게시물입니다.</p>
        <Link to="/" className="btn btn-primary">홈으로 돌아가기</Link>
      </div>
    );
  }

  const isAuthor = user && user.id === post.author.id;

  return (
    <div className="post-detail">
      <article className="post-article">
        {/* Hero Header */}
        <header className="post-hero">
          {post.coverImage && (
            <div className="hero-image">
              <img src={post.coverImage} alt={post.title} />
              <div className="hero-overlay" />
            </div>
          )}
          <div className="hero-content">
            {post.techStack && post.techStack.length > 0 && (
              <div className="tech-stack">
                {post.techStack.map((tech, idx) => (
                  <span key={idx} className="tech-tag">{tech}</span>
                ))}
              </div>
            )}
            <h1 className="post-title">{post.title}</h1>
            {post.summary && <p className="post-summary">{post.summary}</p>}

            <div className="post-meta">
              <Link to={`/profile/${post.author.id}`} className="author-info">
                <div className="author-avatar">
                  {post.author.profile?.avatarUrl ? (
                    <img src={post.author.profile.avatarUrl} alt={post.author.profile?.name} />
                  ) : (
                    <span>{post.author.profile?.name?.[0] || 'U'}</span>
                  )}
                </div>
                <div className="author-details">
                  <span className="author-name">{post.author.profile?.name || '익명'}</span>
                  <span className="author-title">{post.author.profile?.profession || ''}</span>
                </div>
              </Link>
              <div className="meta-divider" />
              <div className="meta-info">
                <span className="meta-item">
                  📅 {formatDate(post.publishedAt || post.createdAt)}
                </span>
                <span className="meta-item">
                  ⏱ {estimateReadTime(post.content)}분 읽기
                </span>
                <span className="meta-item">
                  👁 {post.viewCount?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="post-body">
          <div className="post-content markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: CodeBlock,
                h1: ({ node, ...props }) => <h1 className="md-h1" {...props} />,
                h2: ({ node, ...props }) => <h2 className="md-h2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="md-h3" {...props} />,
                h4: ({ node, ...props }) => <h4 className="md-h4" {...props} />,
                p: ({ node, ...props }) => <p className="md-p" {...props} />,
                a: ({ node, ...props }) => (
                  <a className="md-link" target="_blank" rel="noopener noreferrer" {...props} />
                ),
                ul: ({ node, ...props }) => <ul className="md-ul" {...props} />,
                ol: ({ node, ...props }) => <ol className="md-ol" {...props} />,
                li: ({ node, ...props }) => <li className="md-li" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="md-blockquote" {...props} />
                ),
                hr: ({ node, ...props }) => <hr className="md-hr" {...props} />,
                table: ({ node, ...props }) => (
                  <div className="md-table-wrapper">
                    <table className="md-table" {...props} />
                  </div>
                ),
                img: ({ node, ...props }) => (
                  <img className="md-img" loading="lazy" {...props} />
                ),
                input: ({ node, ...props }) => (
                  <input className="md-checkbox" {...props} />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Project Links */}
          {(post.demoUrl || post.repositoryUrl) && (
            <div className="project-links">
              {post.demoUrl && (
                <a href={post.demoUrl} target="_blank" rel="noopener noreferrer" className="project-link demo">
                  <span>🌐</span> 데모 보기
                </a>
              )}
              {post.repositoryUrl && (
                <a href={post.repositoryUrl} target="_blank" rel="noopener noreferrer" className="project-link repo">
                  <span>📦</span> 소스 코드
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="post-actions">
            <div className="action-buttons">
              <button onClick={handleLike} className={`btn-action ${liked ? 'active' : ''}`}>
                <span>{liked ? '❤️' : '🤍'}</span>
                <span>{post._count?.likes || 0}</span>
              </button>
              <button className={`btn-action ${bookmarked ? 'active bookmark' : ''}`} onClick={() => setBookmarked(!bookmarked)}>
                <span>{bookmarked ? '🔖' : '📑'}</span>
                <span>저장</span>
              </button>
              <button className="btn-action">
                <span>💬</span>
                <span>{post._count?.comments || 0}</span>
              </button>
              <button className="btn-action ai-evaluate-btn" onClick={() => setShowAiModal(true)}>
                <span>🤖</span>
                <span>AI 평가</span>
              </button>
            </div>
            {isAuthor && (
              <div className="author-actions">
                <Link to={`/posts/${id}/edit`} className="btn btn-secondary">✏️ 수정</Link>
                <button onClick={handleDelete} className="btn btn-danger">🗑 삭제</button>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <section className="comments-section">
        <div className="comments-header">
          <h3>💬 댓글</h3>
          <span className="comment-count">{comments.length}</span>
        </div>

        {user && (
          <form onSubmit={handleCommentSubmit} className="comment-form">
            <div className="comment-input-wrapper">
              <div className="comment-avatar">
                {user.profile?.avatarUrl ? (
                  <img src={user.profile.avatarUrl} alt={user.profile?.name} />
                ) : (
                  <span>{user.profile?.name?.[0] || 'U'}</span>
                )}
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 작성하세요..."
                required
              />
            </div>
            <div className="comment-form-actions">
              <button type="submit" className="btn btn-primary">댓글 작성</button>
            </div>
          </form>
        )}

        {!user && (
          <div className="login-prompt">
            <p>댓글을 작성하려면 <Link to="/login">로그인</Link>이 필요합니다.</p>
          </div>
        )}

        <div className="comments-list">
          {comments.length === 0 ? (
            <div className="comments-empty">
              <span className="empty-icon">💭</span>
              <p>아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <div className="comment-author">
                    <div className="comment-avatar">
                      {comment.author.profile?.avatarUrl ? (
                        <img src={comment.author.profile.avatarUrl} alt={comment.author.profile?.name} />
                      ) : (
                        <span>{comment.author.profile?.name?.[0] || 'U'}</span>
                      )}
                    </div>
                    <div className="comment-author-info">
                      <strong>{comment.author.profile?.name || '익명'}</strong>
                      <span>{formatDate(comment.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* AI Feedback Modal */}
      <AIFeedbackModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        post={post}
      />
    </div>
  );
};

export default PostDetail;
