import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found">
      <div className="not-found-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="not-found-content">
        <div className="glitch-container">
          <h1 className="error-code" data-text="404">404</h1>
        </div>

        <div className="error-icon">
          <span className="icon-broken">🔗</span>
          <div className="icon-ring"></div>
        </div>

        <h2 className="error-title">페이지를 찾을 수 없습니다</h2>
        <p className="error-description">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          <br />
          URL을 확인하거나 아래 버튼을 통해 이동해주세요.
        </p>

        <div className="error-actions">
          <Link to="/" className="btn btn-primary ripple-container">
            <span>🏠</span>
            홈으로 돌아가기
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-secondary">
            <span>←</span>
            이전 페이지
          </button>
        </div>

        <div className="error-suggestions">
          <p className="suggestions-title">다음 페이지를 방문해보세요:</p>
          <div className="suggestions-links">
            <Link to="/" className="suggestion-link">
              <span>📰</span> 피드
            </Link>
            <Link to="/dashboard" className="suggestion-link">
              <span>📊</span> 대시보드
            </Link>
            <Link to="/posts/create" className="suggestion-link">
              <span>✍️</span> 글쓰기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
