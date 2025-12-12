import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // localStorage 또는 sessionStorage에서 토큰 확인
    const token = authService.getToken();
    if (token) {
      authService.getCurrentUser()
        .then(setUser)
        .catch(() => {
          // 토큰이 유효하지 않으면 모두 삭제
          authService.logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, rememberMe = false, saveEmail = false) => {
    // 아이디 저장 처리
    if (saveEmail) {
      authService.saveEmail(email);
    } else {
      authService.clearSavedEmail();
    }

    const data = await authService.login(email, password, rememberMe);
    const userData = await authService.getCurrentUser();
    setUser(userData);
    return data;
  };

  const register = async (data) => {
    const result = await authService.register(data);
    // 회원가입 성공 시 자동으로 로그인 상태로 전환
    if (result.access_token) {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    }
    return result;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // 저장된 이메일 가져오기
  const getSavedEmail = () => {
    return authService.getSavedEmail();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getSavedEmail }}>
      {children}
    </AuthContext.Provider>
  );
};
