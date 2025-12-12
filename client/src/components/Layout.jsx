import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationBell } from './NotificationCenter';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand">
            <span className="brand-icon">P</span>
            <span className="brand-text">PortLink</span>
          </Link>

          {user && (
            <div className="nav-center">
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                <span className="nav-icon">📊</span>
                <span>대시보드</span>
              </Link>
            </div>
          )}

          <div className="nav-actions">
            {/* Theme Toggle */}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Notifications */}
            {user && <NotificationBell />}

            {user ? (
              <>
                <Link to="/posts/create" className="btn-create ripple-container">
                  <span>+</span> <span className="btn-create-text">새 글</span>
                </Link>
                <div className="nav-user">
                  <Link to={`/profile/${user.id}`} className="user-avatar">
                    {user.profile?.name?.[0]?.toUpperCase() || 'U'}
                  </Link>
                  <div className="user-dropdown">
                    <Link to={`/profile/${user.id}`} className="dropdown-item">
                      <span>👤</span> 내 프로필
                    </Link>
                    <Link to="/dashboard" className="dropdown-item">
                      <span>📊</span> 대시보드
                    </Link>
                    <div className="dropdown-divider" />
                    <button onClick={handleLogout} className="dropdown-item logout">
                      <span>🚪</span> 로그아웃
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link-auth">로그인</Link>
                <Link to="/register" className="btn-register ripple-container">시작하기</Link>
              </>
            )}

            {/* Hamburger Menu Button */}
            <div
              className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}
              onClick={toggleMobileMenu}
              aria-label="메뉴 열기"
            >
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-header">
          <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
            <span className="brand-icon">P</span>
            <span className="brand-text">PortLink</span>
          </Link>
          <button
            className="mobile-menu-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>

        <nav className="mobile-nav">
          <Link
            to="/"
            className={`mobile-nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>🏠</span> 홈
          </Link>

          {user && (
            <>
              <Link
                to="/dashboard"
                className={`mobile-nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>📊</span> 대시보드
              </Link>
              <Link
                to="/posts/create"
                className={`mobile-nav-link ${isActive('/posts/create') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>✍️</span> 새 글 작성
              </Link>
              <Link
                to={`/profile/${user.id}`}
                className={`mobile-nav-link ${location.pathname.includes('/profile') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>👤</span> 내 프로필
              </Link>
            </>
          )}

          <div className="mobile-menu-divider" />

          {user ? (
            <button onClick={handleLogout} className="mobile-nav-link logout">
              <span>🚪</span> 로그아웃
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>🔐</span> 로그인
              </Link>
              <Link
                to="/register"
                className="mobile-nav-link mobile-nav-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>🚀</span> 시작하기
              </Link>
            </>
          )}
        </nav>
      </div>

      <main className="main-content">{children}</main>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">PortLink</Link>
            <p>개발자 포트폴리오 & 커뮤니티 플랫폼</p>
          </div>

          <div className="footer-links">
            <div className="footer-section">
              <h4>서비스</h4>
              <Link to="/">피드</Link>
              <Link to="/posts/create">글쓰기</Link>
            </div>
            <div className="footer-section">
              <h4>커뮤니티</h4>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2024 PortLink. All rights reserved.</p>
            <div className="footer-bottom-links">
              <a href="#">이용약관</a>
              <a href="#">개인정보처리방침</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
