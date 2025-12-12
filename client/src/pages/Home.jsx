import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { postService } from '../services';
import './Home.css';

const sortOptions = [
  { value: 'trending', label: '트렌딩' },
  { value: 'latest', label: '최신' },
  { value: 'popular', label: '인기' },
];

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    sortBy: 'trending',
    search: '',
    techStack: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await postService.getFeed(filter);
        setPosts(data?.posts ?? []);
      } catch (error) {
        console.error('Failed to load posts:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [filter]);

  const totals = useMemo(() => {
    const safePosts = posts || [];
    const viewCount = safePosts.reduce((sum, post) => sum + (post.viewCount || 0), 0);
    const likes = safePosts.reduce((sum, post) => sum + (post._count?.likes || 0), 0);
    const comments = safePosts.reduce((sum, post) => sum + (post._count?.comments || 0), 0);
    return { viewCount, likes, comments };
  }, [posts]);

  const trendingTags = useMemo(() => {
    const safePosts = posts || [];
    const map = new Map();
    safePosts.forEach((post) => {
      (post.techStack || []).forEach((tag) => {
        map.set(tag, (map.get(tag) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [posts]);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">포트폴리오 & 커뮤니티</p>
          <h1>
            당신의 프로젝트가
            <span> 메인 스테이지</span>에 오르는 순간
          </h1>
          <p className="lede">
            PortLink에서 시선을 끌고, 피드백을 받고, 함께 성장하세요. 실시간 인기, 트렌딩 태그, 알림까지 한눈에.
          </p>
          <div className="hero-actions">
            <Link to="/posts/create" className="btn-primary">
              프로젝트 올리기
            </Link>
            <Link to="/login" className="btn-ghost">
              커뮤니티 둘러보기
            </Link>
          </div>
          <div className="hero-badges">
            {trendingTags.length > 0 ? (
              trendingTags.map((tag) => (
                <span key={tag} className="pill">
                  #{tag}
                </span>
              ))
            ) : (
              <span className="pill muted">태그를 모으는 중...</span>
            )}
          </div>
          <div className="hero-cta-note">새로 올린 포스트는 트렌딩에 바로 반영돼요.</div>
        </div>
        <div className="hero-visual">
          <div className="floating-card">
            <div className="floating-header">
              <span className="dot blue" />
              <span className="dot cyan" />
              <span className="dot amber" />
              <span className="floating-label">라이브 피드</span>
            </div>
            <div className="floating-list">
              {posts.slice(0, 4).map((post) => (
                <Link key={post.id} to={`/posts/${post.id}`} className="floating-item">
                  <div className="item-info">
                    <p className="item-title">{post.title}</p>
                    <p className="item-meta">
                      {post.author?.profile?.name || '익명'} · {post.techStack?.slice(0, 2).join(' · ') || 'New'}
                    </p>
                  </div>
                  <div className="item-stats">
                    <span>👁 {post.viewCount || 0}</span>
                    <span>❤ {post._count?.likes || 0}</span>
                  </div>
                </Link>
              ))}
              {posts.length === 0 && <p className="floating-empty">첫 번째 프로젝트를 올려보세요.</p>}
            </div>
          </div>
          <div className="metric-grid">
            <div className="metric-card">
              <p className="metric-label">총 조회수</p>
              <h3>{totals.viewCount.toLocaleString()}</h3>
              <p className="metric-hint">커뮤니티의 집중도</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">모인 좋아요</p>
              <h3>{totals.likes.toLocaleString()}</h3>
              <p className="metric-hint">공감된 순간들</p>
            </div>
            <div className="metric-card accent">
              <p className="metric-label">남겨진 댓글</p>
              <h3>{totals.comments.toLocaleString()}</h3>
              <p className="metric-hint">대화가 이어집니다</p>
            </div>
          </div>
        </div>
      </section>

      <section className="feed-panel">
        <div className="feed-header">
          <div>
            <p className="eyebrow">피드</p>
            <h2>지금 올라온 프로젝트</h2>
          </div>
          <div className="sort-tabs">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter((prev) => ({ ...prev, sortBy: opt.value }))}
                className={`sort-tab ${filter.sortBy === opt.value ? 'active' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-bar">
          <input
            type="text"
            placeholder="키워드, 기술스택, 팀 이름 검색..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
          <div className="ghost-note">정렬 · 검색은 실시간으로 적용됩니다</div>
        </div>

        {loading ? (
          <div className="skeleton-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="skeleton-card" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="posts-grid">
            {posts.map((post) => (
              <Link key={post.id} to={`/posts/${post.id}`} className="post-card">
                {post.coverImage && (
                  <div className="post-media">
                    <img src={post.coverImage} alt={post.title} />
                  </div>
                )}
                <div className="post-body">
                  <div className="post-top">
                    <div className="chip muted">{post.status === 'PUBLISHED' ? '공개' : '임시'}</div>
                    <div className="post-stats">
                      <span>👁 {post.viewCount ?? 0}</span>
                      <span>❤ {post._count?.likes ?? 0}</span>
                      <span>💬 {post._count?.comments ?? 0}</span>
                    </div>
                  </div>
                  <h3>{post.title}</h3>
                  <p className="post-summary">{post.summary || '설명이 준비 중입니다.'}</p>
                  <div className="post-footer">
                    <div className="author">
                      <div className="avatar-fallback">{post.author?.profile?.name?.[0] || 'P'}</div>
                      <span>{post.author?.profile?.name || '익명 개발자'}</span>
                    </div>
                    <div className="tech-stack">
                      {(post.techStack || []).slice(0, 3).map((tech, idx) => (
                        <span key={idx} className="tech-tag">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="no-posts">
            <p>아직 게시물이 없습니다. 첫 번째 프로젝트를 공유해보세요!</p>
            <Link to="/posts/create" className="btn-primary">
              지금 작성하기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
