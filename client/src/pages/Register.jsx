import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const API_BASE = '/api/v1';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    username: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });
  const { register } = useAuth();
  const navigate = useNavigate();

  // Username validation regex
  const isValidUsernameFormat = (username) => {
    if (!username || username.length < 3 || username.length > 30) return false;
    if (!/^[a-zA-Z]/.test(username)) return false;
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) return false;
    if (/[_.]{2,}/.test(username)) return false;
    if (/[_.]$/.test(username)) return false;
    return true;
  };

  // Check username availability with debounce
  const checkUsername = useCallback(async (username) => {
    if (!username || username.length < 3) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    if (!isValidUsernameFormat(username)) {
      setUsernameStatus({ checking: false, available: false, message: '유효하지 않은 형식입니다' });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: '확인 중...' });

    try {
      const response = await fetch(`${API_BASE}/mentions/check-username?username=${username.toLowerCase()}`);
      const result = await response.json();
      const available = result.data?.available ?? result.available;
      setUsernameStatus({
        checking: false,
        available: available,
        message: available ? '사용 가능합니다' : '이미 사용 중입니다',
      });
    } catch {
      setUsernameStatus({ checking: false, available: null, message: '확인 실패' });
    }
  }, []);

  // Debounced username change handler
  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setFormData({ ...formData, username: value });

    // Debounce the API call
    clearTimeout(window.usernameCheckTimeout);
    window.usernameCheckTimeout = setTimeout(() => {
      checkUsername(value);
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      // 회원가입 성공 시 자동 로그인되어 메인 페이지로 이동
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
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
            지금 합류해서
            <span> 무대를 채워보세요</span>
          </h1>
          <p className="lede">
            포트폴리오를 올리고, 피드백을 받고, 커뮤니티와 함께 성장합니다.
          </p>
          <div className="auth-pills">
            <span className="pill">포스트 작성</span>
            <span className="pill">북마크 & 좋아요</span>
            <span className="pill">알림</span>
          </div>
        </div>
        <div className="auth-card">
          <h2>회원가입</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>사용자명 (멘션용)</label>
              <div className="username-input-wrapper">
                <span className="username-prefix">@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  placeholder="username"
                  minLength={3}
                  maxLength={30}
                />
              </div>
              {formData.username && (
                <div className={`username-status ${usernameStatus.available === true ? 'available' : usernameStatus.available === false ? 'taken' : ''}`}>
                  {usernameStatus.checking && <span className="checking">확인 중...</span>}
                  {!usernameStatus.checking && usernameStatus.message && (
                    <span>{usernameStatus.message}</span>
                  )}
                </div>
              )}
              <small className="field-hint">영문, 숫자, 밑줄(_), 점(.)만 사용 가능 (3-30자)</small>
            </div>
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
                minLength={6}
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button
              type="submit"
              className="btn primary"
              disabled={loading || (formData.username && usernameStatus.available === false) || usernameStatus.checking}
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>
          <p className="auth-link">
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
