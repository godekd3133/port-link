import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, engagementData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getEngagement(),
      ]);
      setStats(statsData);
      setEngagement(engagementData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h4>로그인이 필요합니다</h4>
          <p>대시보드를 보려면 먼저 로그인해주세요.</p>
          <Link to="/login" className="btn btn-primary">로그인하기</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>대시보드를 불러오는 중...</p>
      </div>
    );
  }

  const overview = stats?.overview || {
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <p className="eyebrow">My Dashboard</p>
        <h1>안녕하세요, {user.profile?.name || '개발자'}님!</h1>
        <p>오늘도 멋진 프로젝트로 커뮤니티와 소통해보세요.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <h3>총 게시물</h3>
          <p className="stat-value">{overview.totalPosts.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👁️</div>
          <h3>총 조회수</h3>
          <p className="stat-value">{overview.totalViews.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❤️</div>
          <h3>총 좋아요</h3>
          <p className="stat-value">{overview.totalLikes.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <h3>총 댓글</h3>
          <p className="stat-value">{overview.totalComments.toLocaleString()}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="posts-section">
          <div className="section-header">
            <h3><span>📊</span> 내 게시물</h3>
            <Link to="/posts/create" className="view-all">+ 새 글 작성</Link>
          </div>
          {stats?.posts && stats.posts.length > 0 ? (
            <div className="posts-table">
              {stats.posts.map((post, idx) => (
                <div key={post.id} className="post-row">
                  <div className="post-info">
                    <div className="post-rank">{idx + 1}</div>
                    <Link to={`/posts/${post.id}`} className="post-title">
                      {post.title}
                    </Link>
                  </div>
                  <div className="post-stats">
                    <span>👁️ {post.viewCount}</span>
                    <span>❤️ {post.likeCount}</span>
                    <span>💬 {post.commentCount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h4>아직 게시물이 없습니다</h4>
              <p>첫 번째 프로젝트를 공유해보세요!</p>
              <Link to="/posts/create" className="btn btn-primary">글 작성하기</Link>
            </div>
          )}
        </div>

        <div className="engagement-section">
          <div className="section-header">
            <h3><span>⚡</span> 내 활동</h3>
          </div>
          <div className="engagement-grid">
            <div className="engagement-item">
              <div className="engagement-icon likes">❤️</div>
              <div className="engagement-info">
                <p>좋아요한 게시물</p>
                <strong>{engagement?.likedPosts || 0}</strong>
              </div>
            </div>
            <div className="engagement-item">
              <div className="engagement-icon bookmarks">🔖</div>
              <div className="engagement-info">
                <p>북마크한 게시물</p>
                <strong>{engagement?.bookmarkedPosts || 0}</strong>
              </div>
            </div>
            <div className="engagement-item">
              <div className="engagement-icon comments">💬</div>
              <div className="engagement-info">
                <p>작성한 댓글</p>
                <strong>{engagement?.commentsWritten || 0}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
