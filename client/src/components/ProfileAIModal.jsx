import { useState } from 'react';
import { aiService } from '../services';
import './ProfileAIModal.css';

const ProfileAIModal = ({ isOpen, onClose, profile, posts }) => {
  const [activeTab, setActiveTab] = useState('evaluate'); // 'evaluate' | 'interview'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Evaluation state
  const [evaluation, setEvaluation] = useState(null);

  // Interview state
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  if (!isOpen) return null;

  // Combine all posts into portfolio data
  const getPortfolioData = () => {
    const allContent = posts.map(post => `
### ${post.title}
${post.summary || ''}
${post.content || ''}
    `).join('\n\n---\n\n');

    const allSkills = [...new Set(posts.flatMap(post => post.techStack || []))];

    return {
      title: `${profile.name || '사용자'}의 포트폴리오`,
      summary: profile.bio || '',
      content: allContent,
      skills: profile.skills || allSkills,
      techStack: allSkills,
      profession: profile.profession,
    };
  };

  const handleEvaluate = async () => {
    if (posts.length === 0) {
      setError('평가할 프로젝트가 없습니다. 먼저 프로젝트를 등록해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const portfolioData = getPortfolioData();
      const result = await aiService.evaluatePortfolio(portfolioData);
      setEvaluation(result);
    } catch (err) {
      setError(err.response?.data?.message || 'AI 평가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInterview = async () => {
    if (posts.length === 0) {
      setError('면접 질문을 생성할 프로젝트가 없습니다. 먼저 프로젝트를 등록해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const portfolioData = getPortfolioData();
      const result = await aiService.generateInterviewQuestions(portfolioData);
      setInterviewQuestions(result.questions || []);
    } catch (err) {
      setError(err.response?.data?.message || '면접 질문 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'needs-work';
  };

  const renderScoreCircle = (score, label) => (
    <div className={`score-circle ${getScoreColor(score)}`}>
      <svg viewBox="0 0 36 36">
        <path
          className="circle-bg"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="circle-progress"
          strokeDasharray={`${score}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div className="score-value">{score}</div>
      <div className="score-label">{label}</div>
    </div>
  );

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-tabs">
            <button
              className={`tab ${activeTab === 'evaluate' ? 'active' : ''}`}
              onClick={() => setActiveTab('evaluate')}
            >
              <span className="tab-icon">📊</span>
              포트폴리오 평가
            </button>
            <button
              className={`tab ${activeTab === 'interview' ? 'active' : ''}`}
              onClick={() => setActiveTab('interview')}
            >
              <span className="tab-icon">💼</span>
              면접 질문
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="ai-modal-content">
          {error && <div className="ai-error">{error}</div>}

          {/* Evaluate Tab */}
          {activeTab === 'evaluate' && (
            <div className="evaluate-tab">
              {!evaluation ? (
                <div className="ai-intro">
                  <div className="ai-intro-icon">🤖</div>
                  <h3>AI 포트폴리오 종합 평가</h3>
                  <p>
                    등록된 {posts.length}개의 프로젝트를 종합 분석하여
                    채용 담당자 관점에서 평가해드립니다.
                  </p>
                  <ul className="ai-features">
                    <li>전체 완성도 점수</li>
                    <li>전문성 및 기술력 평가</li>
                    <li>채용 매력도 분석</li>
                    <li>구체적인 개선 제안</li>
                  </ul>
                  <button
                    className="btn btn-primary ai-action-btn"
                    onClick={handleEvaluate}
                    disabled={loading || posts.length === 0}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-small" />
                        분석 중...
                      </>
                    ) : (
                      '종합 평가 시작'
                    )}
                  </button>
                </div>
              ) : (
                <div className="evaluation-result">
                  {/* Overall Score */}
                  <div className="overall-score-section">
                    {renderScoreCircle(evaluation.overallScore, '종합 점수')}
                    <p className="overall-summary">{evaluation.summary}</p>
                  </div>

                  {/* Detailed Scores */}
                  <div className="detailed-scores">
                    <div className="score-card">
                      <div className="score-header">
                        <span className="score-icon">📝</span>
                        <span>완성도</span>
                        <span className={`score-badge ${getScoreColor(evaluation.completeness?.score)}`}>
                          {evaluation.completeness?.score}점
                        </span>
                      </div>
                      <p className="score-feedback">{evaluation.completeness?.feedback}</p>
                      {evaluation.completeness?.suggestions?.length > 0 && (
                        <ul className="suggestions">
                          {evaluation.completeness.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="score-card">
                      <div className="score-header">
                        <span className="score-icon">⚡</span>
                        <span>전문성</span>
                        <span className={`score-badge ${getScoreColor(evaluation.technicalAppeal?.score)}`}>
                          {evaluation.technicalAppeal?.score}점
                        </span>
                      </div>
                      <p className="score-feedback">{evaluation.technicalAppeal?.feedback}</p>
                      {evaluation.technicalAppeal?.suggestions?.length > 0 && (
                        <ul className="suggestions">
                          {evaluation.technicalAppeal.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="score-card">
                      <div className="score-header">
                        <span className="score-icon">👁️</span>
                        <span>가독성</span>
                        <span className={`score-badge ${getScoreColor(evaluation.readability?.score)}`}>
                          {evaluation.readability?.score}점
                        </span>
                      </div>
                      <p className="score-feedback">{evaluation.readability?.feedback}</p>
                      {evaluation.readability?.suggestions?.length > 0 && (
                        <ul className="suggestions">
                          {evaluation.readability.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="score-card">
                      <div className="score-header">
                        <span className="score-icon">🎯</span>
                        <span>채용 매력도</span>
                        <span className={`score-badge ${getScoreColor(evaluation.hiringAppeal?.score)}`}>
                          {evaluation.hiringAppeal?.score}점
                        </span>
                      </div>
                      <p className="score-feedback">{evaluation.hiringAppeal?.feedback}</p>
                      {evaluation.hiringAppeal?.suggestions?.length > 0 && (
                        <ul className="suggestions">
                          {evaluation.hiringAppeal.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Strengths & Improvements */}
                  <div className="strengths-improvements">
                    <div className="strengths">
                      <h4>💪 강점</h4>
                      <ul>
                        {evaluation.strengths?.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="improvements">
                      <h4>📈 개선 포인트</h4>
                      <ul>
                        {evaluation.improvements?.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary re-evaluate-btn"
                    onClick={() => setEvaluation(null)}
                  >
                    다시 평가하기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Interview Tab */}
          {activeTab === 'interview' && (
            <div className="interview-tab">
              {interviewQuestions.length === 0 ? (
                <div className="ai-intro">
                  <div className="ai-intro-icon">💼</div>
                  <h3>AI 면접 질문 생성</h3>
                  <p>
                    등록된 프로젝트를 바탕으로 실제 면접에서
                    받을 수 있는 질문을 생성해드립니다.
                  </p>
                  <ul className="ai-features">
                    <li>프로젝트 기반 맞춤 질문</li>
                    <li>기술적 질문 & 소프트 스킬</li>
                    <li>답변 힌트 제공</li>
                    <li>카테고리별 분류</li>
                  </ul>
                  <button
                    className="btn btn-primary ai-action-btn"
                    onClick={handleGenerateInterview}
                    disabled={loading || posts.length === 0}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-small" />
                        생성 중...
                      </>
                    ) : (
                      '면접 질문 생성'
                    )}
                  </button>
                </div>
              ) : (
                <div className="interview-result">
                  <div className="questions-header">
                    <h3>예상 면접 질문 ({interviewQuestions.length}개)</h3>
                    <p>각 질문을 클릭하면 답변 힌트를 볼 수 있습니다.</p>
                  </div>

                  <div className="questions-list">
                    {interviewQuestions.map((q, index) => (
                      <div
                        key={index}
                        className={`question-card ${expandedQuestion === index ? 'expanded' : ''}`}
                        onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                      >
                        <div className="question-header">
                          <span className="question-number">Q{index + 1}</span>
                          <span className="question-category">{q.category}</span>
                        </div>
                        <p className="question-text">{q.question}</p>
                        {expandedQuestion === index && (
                          <div className="question-hint">
                            <span className="hint-label">💡 답변 힌트</span>
                            <p>{q.hint}</p>
                          </div>
                        )}
                        <span className="expand-icon">
                          {expandedQuestion === index ? '▲' : '▼'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn btn-secondary re-generate-btn"
                    onClick={() => setInterviewQuestions([])}
                  >
                    새로운 질문 생성
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileAIModal;
