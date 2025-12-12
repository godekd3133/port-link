import { useState } from 'react';
import { aiService } from '../services';
import './AIFeedbackModal.css';

const ScoreCircle = ({ score, label }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="score-circle">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="24"
          fontWeight="bold"
        >
          {score}
        </text>
      </svg>
      <span className="score-label">{label}</span>
    </div>
  );
};

const CategoryCard = ({ category, icon }) => (
  <div className="category-card">
    <div className="category-header">
      <span className="category-icon">{icon}</span>
      <div className="category-score">
        <span className="score-value">{category.score}</span>
        <span className="score-max">/100</span>
      </div>
    </div>
    <p className="category-feedback">{category.feedback}</p>
    {category.suggestions?.length > 0 && (
      <div className="category-suggestions">
        <span className="suggestions-title">개선 제안:</span>
        <ul>
          {category.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const AIFeedbackModal = ({ isOpen, onClose, post }) => {
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState('');

  const handleEvaluate = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await aiService.evaluatePortfolio({
        title: post.title,
        content: post.content,
        summary: post.summary,
        techStack: post.techStack,
        demoUrl: post.demoUrl,
        repositoryUrl: post.repositoryUrl,
      });
      setEvaluation(result);
    } catch (err) {
      console.error('AI evaluation error:', err);
      setError(err.response?.data?.message || 'AI 평가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h2>🤖 AI 포트폴리오 평가</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="ai-modal-content">
          {!evaluation && !loading && (
            <div className="ai-intro">
              <div className="ai-intro-icon">🎯</div>
              <h3>포트폴리오를 AI가 평가해드립니다</h3>
              <p>
                채용 담당자 관점에서 포트폴리오의 완성도, 기술 어필,
                가독성, 채용 매력도를 분석하고 개선점을 제안합니다.
              </p>
              <ul className="ai-features">
                <li>📊 4가지 항목별 점수</li>
                <li>💪 강점 분석</li>
                <li>📝 구체적인 개선 제안</li>
              </ul>
              {error && <div className="ai-modal-error">{error}</div>}
              <button
                className="btn btn-primary ai-start-btn"
                onClick={handleEvaluate}
                disabled={loading}
              >
                🚀 AI 평가 시작하기
              </button>
            </div>
          )}

          {loading && (
            <div className="ai-loading">
              <div className="ai-loading-spinner"></div>
              <h3>AI가 포트폴리오를 분석하고 있습니다...</h3>
              <p>잠시만 기다려주세요</p>
            </div>
          )}

          {evaluation && (
            <div className="ai-result">
              {/* Overall Score */}
              <div className="overall-section">
                <ScoreCircle score={evaluation.overallScore} label="종합 점수" />
                <div className="overall-summary">
                  <h3>한줄 평가</h3>
                  <p>{evaluation.summary}</p>
                </div>
              </div>

              {/* Category Scores */}
              <div className="categories-section">
                <h3>📊 상세 평가</h3>
                <div className="categories-grid">
                  <CategoryCard
                    category={evaluation.completeness}
                    icon="✅"
                  />
                  <CategoryCard
                    category={evaluation.technicalAppeal}
                    icon="💻"
                  />
                  <CategoryCard
                    category={evaluation.readability}
                    icon="📖"
                  />
                  <CategoryCard
                    category={evaluation.hiringAppeal}
                    icon="💼"
                  />
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="feedback-section">
                <div className="feedback-column strengths">
                  <h4>💪 강점</h4>
                  <ul>
                    {evaluation.strengths?.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="feedback-column improvements">
                  <h4>📝 개선 필요</h4>
                  <ul>
                    {evaluation.improvements?.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="ai-result-footer">
                <button className="btn btn-secondary" onClick={() => setEvaluation(null)}>
                  다시 평가하기
                </button>
                <button className="btn btn-primary" onClick={onClose}>
                  확인
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIFeedbackModal;
