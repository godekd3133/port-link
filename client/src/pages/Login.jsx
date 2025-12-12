import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const { login, getSavedEmail } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [saveEmail, setSaveEmail] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = getSavedEmail();
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setSaveEmail(true);
    }
    // 자동 로그인 설정 불러오기
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(savedRememberMe);
  }, [getSavedEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password, rememberMe, saveEmail);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-hero">
          <p className="eyebrow">PortLink</p>
          <h1>
            다시 돌아오신 걸 환영해요
            <span> 👋</span>
          </h1>
          <p className="lede">
            좋아요, 북마크, 알림을 한눈에. 트렌딩 프로젝트를 놓치지 마세요.
          </p>
          <div className="auth-pills">
            <span className="pill">JWT 인증</span>
            <span className="pill">트렌딩 피드</span>
            <span className="pill">실시간 알림</span>
          </div>
        </div>
        <div className="auth-card">
          <h2>로그인</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>이메일</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="auth-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={saveEmail}
                  onChange={(e) => setSaveEmail(e.target.checked)}
                />
                <span>아이디 저장</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>자동 로그인</span>
              </label>
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <p className="auth-link">
            계정이 없으신가요? <Link to="/register">회원가입</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
