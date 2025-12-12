import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  insightsService,
  portfolioCoachService,
  analyticsService,
  matchingService,
} from '../services';
import './CareerInsights.css';

const PROFESSION_LABELS = {
  DEVELOPER: '개발자',
  DESIGNER: '디자이너',
  PM: '기획자/PM',
  MARKETER: '마케터',
  DATA_ANALYST: '데이터 분석가',
  CONTENT_CREATOR: '콘텐츠 크리에이터',
  WRITER: '작가/카피라이터',
  PHOTOGRAPHER: '포토그래퍼',
  VIDEO_CREATOR: '영상 크리에이터',
  MUSICIAN: '뮤지션/작곡가',
  PLANNER: '전략기획',
  RESEARCHER: '연구원',
  CONSULTANT: '컨설턴트',
  EDUCATOR: '교육자',
  OTHER: '기타',
};

const CareerInsights = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [completeness, setCompleteness] = useState(null);
  const [impact, setImpact] = useState(null);
  const [similarProfiles, setSimilarProfiles] = useState([]);
  const [skillTrends, setSkillTrends] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [insightsData, completenessData, impactData, similarData, trendsData] =
        await Promise.all([
          insightsService.getCareerInsights().catch(() => null),
          portfolioCoachService.getCompleteness().catch(() => null),
          analyticsService.getImpactMetrics().catch(() => null),
          matchingService.findSimilarProfiles(5).catch(() => []),
          insightsService.getSkillTrends().catch(() => []),
        ]);

      setInsights(insightsData);
      setCompleteness(completenessData);
      setImpact(impactData);
      setSimilarProfiles(similarData);
      setSkillTrends(trendsData);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="career-insights-page">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h4>로그인이 필요합니다</h4>
          <p>커리어 인사이트를 확인하려면 먼저 로그인해주세요.</p>
          <Link to="/login" className="btn btn-primary">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="career-insights-loading">
        <div className="spinner" />
        <p>커리어 인사이트를 분석하는 중...</p>
      </div>
    );
  }

  const renderScoreGauge = (score, label) => {
    const getColor = (s) => {
      if (s >= 80) return '#10b981';
      if (s >= 60) return '#f59e0b';
      if (s >= 40) return '#f97316';
      return '#ef4444';
    };

    return (
      <div className="score-gauge">
        <svg viewBox="0 0 100 50" className="gauge-svg">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={getColor(score)}
            strokeWidth="8"
            strokeDasharray={`${(score / 100) * 126} 126`}
            strokeLinecap="round"
          />
        </svg>
        <div className="gauge-value">{score}</div>
        <div className="gauge-label">{label}</div>
      </div>
    );
  };

  return (
    <div className="career-insights-page">
      <div className="insights-header">
        <p className="eyebrow">Career Insights</p>
        <h1>커리어 인사이트</h1>
        <p>데이터 기반으로 당신의 커리어를 분석하고 성장 방향을 제시합니다.</p>
      </div>

      {/* Tabs */}
      <div className="insights-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          개요
        </button>
        <button
          className={`tab ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          스킬 분석
        </button>
        <button
          className={`tab ${activeTab === 'impact' ? 'active' : ''}`}
          onClick={() => setActiveTab('impact')}
        >
          임팩트
        </button>
        <button
          className={`tab ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          네트워크
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          {/* Score Cards */}
          <div className="score-cards">
            <div className="score-card">
              {renderScoreGauge(
                completeness?.score || 0,
                '프로필 완성도'
              )}
              <span className="score-level">
                {completeness?.level === 'beginner' && '초급'}
                {completeness?.level === 'intermediate' && '중급'}
                {completeness?.level === 'advanced' && '고급'}
                {completeness?.level === 'expert' && '전문가'}
              </span>
            </div>
            <div className="score-card">
              {renderScoreGauge(
                insights?.profileStrength || 0,
                '프로필 강점'
              )}
              <span className="score-rank">
                {insights?.competitorAnalysis?.yourRank || '측정 중'}
              </span>
            </div>
            <div className="score-card engagement">
              <div className="metric-value">
                {impact?.engagementRate?.toFixed(1) || 0}%
              </div>
              <div className="metric-label">참여율</div>
              <div className={`metric-trend ${impact?.reachGrowth >= 0 ? 'up' : 'down'}`}>
                {impact?.reachGrowth >= 0 ? '↑' : '↓'} {Math.abs(impact?.reachGrowth || 0)}%
              </div>
            </div>
          </div>

          {/* Market Position */}
          <div className="insight-section">
            <h2>시장 포지션</h2>
            <div className="market-position">
              <div className="position-badge">
                {insights?.marketPosition || '분석 중...'}
              </div>
            </div>
          </div>

          {/* Career Path Suggestions */}
          {insights?.careerPathSuggestions?.length > 0 && (
            <div className="insight-section">
              <h2>커리어 패스 제안</h2>
              <ul className="career-paths">
                {insights.careerPathSuggestions.map((suggestion, idx) => (
                  <li key={idx}>
                    <span className="path-icon">🎯</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Competitor Analysis */}
          {insights?.competitorAnalysis && (
            <div className="insight-section">
              <h2>동종 업계 비교</h2>
              <div className="competitor-stats">
                <div className="stat">
                  <span className="stat-label">평균 스킬 수</span>
                  <span className="stat-value">
                    {insights.competitorAnalysis.avgSkillCount}개
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">평균 프로젝트 수</span>
                  <span className="stat-value">
                    {insights.competitorAnalysis.avgProjectCount}개
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">내 순위</span>
                  <span className="stat-value highlight">
                    {insights.competitorAnalysis.yourRank}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="tab-content">
          {/* Skill Gaps */}
          {insights?.skillGaps?.length > 0 && (
            <div className="insight-section">
              <h2>스킬 갭 분석</h2>
              <p className="section-desc">
                동종 업계에서 많이 사용하지만 아직 보유하지 않은 스킬입니다.
              </p>
              <div className="skill-gaps">
                {insights.skillGaps.map((skill, idx) => (
                  <div key={idx} className="skill-gap-item">
                    <span className="gap-icon">📚</span>
                    <span className="gap-skill">{skill}</span>
                    <span className="gap-label">학습 추천</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Skills */}
          {insights?.recommendedSkills?.length > 0 && (
            <div className="insight-section">
              <h2>추천 스킬</h2>
              <div className="recommended-skills">
                {insights.recommendedSkills.map((skill, idx) => (
                  <div key={idx} className="skill-card">
                    <div className="skill-header">
                      <span className="skill-name">{skill.skill}</span>
                      <span className={`skill-trend ${skill.trend}`}>
                        {skill.trend === 'rising' && '📈 상승'}
                        {skill.trend === 'stable' && '➡️ 안정'}
                        {skill.trend === 'declining' && '📉 하락'}
                      </span>
                    </div>
                    <div className="skill-demand">
                      <div className="demand-bar">
                        <div
                          className="demand-fill"
                          style={{ width: `${skill.demandScore}%` }}
                        />
                      </div>
                      <span className="demand-score">{skill.demandScore}% 수요</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill Trends */}
          {skillTrends?.length > 0 && (
            <div className="insight-section">
              <h2>플랫폼 스킬 트렌드</h2>
              <div className="skill-trends">
                {skillTrends.slice(0, 10).map((trend, idx) => (
                  <div key={idx} className="trend-item">
                    <span className="trend-rank">#{idx + 1}</span>
                    <span className="trend-skill">{trend.skill}</span>
                    <span className="trend-score">{trend.demandScore}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry Top Skills */}
          {insights?.industryInsights?.topSkillsInProfession?.length > 0 && (
            <div className="insight-section">
              <h2>업계 인기 스킬</h2>
              <div className="top-skills">
                {insights.industryInsights.topSkillsInProfession.map((skill, idx) => (
                  <span key={idx} className="top-skill-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Impact Tab */}
      {activeTab === 'impact' && (
        <div className="tab-content">
          {/* Impact Overview */}
          <div className="insight-section">
            <h2>임팩트 개요</h2>
            <div className="impact-stats">
              <div className="impact-stat">
                <span className="impact-icon">👁️</span>
                <span className="impact-value">{impact?.totalViews?.toLocaleString() || 0}</span>
                <span className="impact-label">총 조회수</span>
              </div>
              <div className="impact-stat">
                <span className="impact-icon">❤️</span>
                <span className="impact-value">{impact?.totalLikes?.toLocaleString() || 0}</span>
                <span className="impact-label">총 좋아요</span>
              </div>
              <div className="impact-stat">
                <span className="impact-icon">💬</span>
                <span className="impact-value">{impact?.totalComments?.toLocaleString() || 0}</span>
                <span className="impact-label">총 댓글</span>
              </div>
              <div className="impact-stat">
                <span className="impact-icon">🔖</span>
                <span className="impact-value">{impact?.totalBookmarks?.toLocaleString() || 0}</span>
                <span className="impact-label">총 북마크</span>
              </div>
            </div>
          </div>

          {/* Monthly Trend */}
          {impact?.monthlyTrend?.length > 0 && (
            <div className="insight-section">
              <h2>월별 트렌드</h2>
              <div className="monthly-trend">
                {impact.monthlyTrend.map((month, idx) => (
                  <div key={idx} className="month-item">
                    <div className="month-bar-container">
                      <div
                        className="month-bar"
                        style={{
                          height: `${Math.min((month.views / Math.max(...impact.monthlyTrend.map(m => m.views), 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="month-label">{month.month.slice(5)}</span>
                    <span className="month-value">{month.views}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Performing Posts */}
          {impact?.topPerformingPosts?.length > 0 && (
            <div className="insight-section">
              <h2>인기 프로젝트</h2>
              <div className="top-posts">
                {impact.topPerformingPosts.map((post, idx) => (
                  <Link key={post.id} to={`/posts/${post.id}`} className="top-post-item">
                    <span className="post-rank">#{idx + 1}</span>
                    <span className="post-title">{post.title}</span>
                    <div className="post-stats">
                      <span>👁️ {post.views}</span>
                      <span>❤️ {post.likes}</span>
                      <span>💬 {post.comments}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Category Distribution */}
          {impact?.viewsByCategory && Object.keys(impact.viewsByCategory).length > 0 && (
            <div className="insight-section">
              <h2>카테고리별 조회수</h2>
              <div className="category-distribution">
                {Object.entries(impact.viewsByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, views]) => (
                    <div key={category} className="category-item">
                      <span className="category-name">{category}</span>
                      <div className="category-bar-container">
                        <div
                          className="category-bar"
                          style={{
                            width: `${(views / Math.max(...Object.values(impact.viewsByCategory))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="category-value">{views}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Network Tab */}
      {activeTab === 'network' && (
        <div className="tab-content">
          {/* Similar Profiles */}
          <div className="insight-section">
            <h2>비슷한 프로필</h2>
            <p className="section-desc">
              같은 직종에서 비슷한 스킬을 가진 사람들입니다.
            </p>
            {similarProfiles?.length > 0 ? (
              <div className="similar-profiles">
                {similarProfiles.map((item, idx) => (
                  <Link
                    key={item.profile.id}
                    to={`/profile/${item.profile.userId}`}
                    className="similar-profile-card"
                  >
                    <div className="profile-avatar">
                      {item.profile.avatar ? (
                        <img src={item.profile.avatar} alt="" />
                      ) : (
                        <span>{item.profile.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="profile-info">
                      <h4>{item.profile.name || '익명'}</h4>
                      <span className="profession">
                        {PROFESSION_LABELS[item.profile.profession] || item.profile.profession}
                      </span>
                    </div>
                    <div className="similarity-badge">
                      {item.similarity}% 유사
                    </div>
                    {item.commonSkills?.length > 0 && (
                      <div className="common-skills">
                        {item.commonSkills.slice(0, 3).map((skill, i) => (
                          <span key={i} className="common-skill">{skill}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state small">
                <p>아직 비슷한 프로필이 없습니다.</p>
              </div>
            )}
          </div>

          {/* Networking Tips */}
          <div className="insight-section">
            <h2>네트워킹 팁</h2>
            <ul className="networking-tips">
              <li>프로필을 완성하면 더 많은 협업 기회를 얻을 수 있습니다.</li>
              <li>관심 있는 프로젝트에 댓글을 달아 관계를 시작하세요.</li>
              <li>동료에게 스킬 추천을 요청해보세요.</li>
              <li>정기적으로 프로젝트를 공유하면 노출이 증가합니다.</li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="insight-section">
            <h2>빠른 액션</h2>
            <div className="quick-actions">
              <Link to="/collaborations" className="action-btn">
                <span>🤝</span>
                협업 요청 확인
              </Link>
              <Link to="/posts/create" className="action-btn">
                <span>✨</span>
                새 프로젝트 공유
              </Link>
              <Link to="/settings/profile" className="action-btn">
                <span>📝</span>
                프로필 수정
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Profile Suggestions */}
      {completeness?.suggestions?.length > 0 && (
        <div className="suggestions-banner">
          <h3>프로필 개선 제안</h3>
          <ul>
            {completeness.suggestions.slice(0, 3).map((suggestion, idx) => (
              <li key={idx}>{suggestion}</li>
            ))}
          </ul>
          <Link to="/settings/profile" className="btn btn-outline">
            프로필 완성하기
          </Link>
        </div>
      )}
    </div>
  );
};

export default CareerInsights;
