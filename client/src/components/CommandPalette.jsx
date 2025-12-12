import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './CommandPalette.css';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('portlink-recent-searches');
    return saved ? JSON.parse(saved) : [];
  });

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Command definitions
  const commands = useMemo(() => {
    const baseCommands = [
      // Navigation
      { id: 'home', label: '홈으로 이동', icon: '🏠', category: '페이지', action: () => navigate('/') },
      { id: 'dashboard', label: '대시보드', icon: '📊', category: '페이지', action: () => navigate('/dashboard'), auth: true },
      { id: 'create-post', label: '새 글 작성', icon: '✍️', category: '페이지', action: () => navigate('/posts/create'), auth: true },
      { id: 'profile', label: '내 프로필', icon: '👤', category: '페이지', action: () => navigate(`/profile/${user?.id}`), auth: true },

      // Actions
      { id: 'theme', label: '테마 전환 (다크/라이트)', icon: '🎨', category: '액션', action: () => {
        document.documentElement.setAttribute('data-theme',
          document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
        );
        localStorage.setItem('portlink-theme', document.documentElement.getAttribute('data-theme'));
      }},
      { id: 'logout', label: '로그아웃', icon: '🚪', category: '액션', action: () => { logout(); navigate('/login'); }, auth: true },

      // Auth (when not logged in)
      { id: 'login', label: '로그인', icon: '🔐', category: '페이지', action: () => navigate('/login'), guest: true },
      { id: 'register', label: '회원가입', icon: '🚀', category: '페이지', action: () => navigate('/register'), guest: true },

      // Help
      { id: 'shortcuts', label: '단축키 보기', icon: '⌨️', category: '도움말', action: () => alert('Cmd/Ctrl + K: 명령 팔레트\nCmd/Ctrl + /: 단축키 도움말') },
    ];

    return baseCommands.filter(cmd => {
      if (cmd.auth && !user) return false;
      if (cmd.guest && user) return false;
      return true;
    });
  }, [user, navigate, logout]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent searches first, then all commands
      const recentCommands = recentSearches
        .map(id => commands.find(c => c.id === id))
        .filter(Boolean)
        .slice(0, 3);

      const otherCommands = commands.filter(c => !recentSearches.includes(c.id));

      return [
        ...(recentCommands.length > 0 ? [{ type: 'header', label: '최근 사용' }] : []),
        ...recentCommands,
        { type: 'header', label: '모든 명령' },
        ...otherCommands,
      ];
    }

    const searchLower = query.toLowerCase();
    const matched = commands.filter(cmd =>
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.category.toLowerCase().includes(searchLower)
    );

    // Group by category
    const grouped = {};
    matched.forEach(cmd => {
      if (!grouped[cmd.category]) grouped[cmd.category] = [];
      grouped[cmd.category].push(cmd);
    });

    const result = [];
    Object.entries(grouped).forEach(([category, cmds]) => {
      result.push({ type: 'header', label: category });
      result.push(...cmds);
    });

    return result;
  }, [query, commands, recentSearches]);

  // Get selectable items (exclude headers)
  const selectableItems = filteredCommands.filter(item => item.type !== 'header');

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, selectableItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectableItems[selectedIndex]) {
          executeCommand(selectableItems[selectedIndex]);
        }
        break;
    }
  }, [selectableItems, selectedIndex]);

  // Execute command
  const executeCommand = useCallback((cmd) => {
    // Save to recent searches
    const newRecent = [cmd.id, ...recentSearches.filter(id => id !== cmd.id)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('portlink-recent-searches', JSON.stringify(newRecent));

    // Execute
    cmd.action();
    setIsOpen(false);
  }, [recentSearches]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector('.command-item.selected');
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let selectableIndex = -1;

  return (
    <>
      <div className="command-palette-overlay" onClick={() => setIsOpen(false)} />
      <div className="command-palette">
        <div className="command-palette-header">
          <span className="command-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            placeholder="명령어 검색... (페이지 이동, 액션 실행)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="command-shortcut">ESC</kbd>
        </div>

        <div className="command-list" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="command-empty">
              <span>🔍</span>
              <p>"{query}"에 대한 결과가 없습니다</p>
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              if (item.type === 'header') {
                return (
                  <div key={`header-${index}`} className="command-category">
                    {item.label}
                  </div>
                );
              }

              selectableIndex++;
              const isSelected = selectableIndex === selectedIndex;

              return (
                <button
                  key={item.id}
                  className={`command-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => executeCommand(item)}
                  onMouseEnter={() => setSelectedIndex(selectableIndex)}
                >
                  <span className="command-item-icon">{item.icon}</span>
                  <span className="command-item-label">{item.label}</span>
                  <span className="command-item-category">{item.category}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-hint">
            <kbd>↑↓</kbd> 이동
          </div>
          <div className="command-hint">
            <kbd>Enter</kbd> 실행
          </div>
          <div className="command-hint">
            <kbd>Esc</kbd> 닫기
          </div>
        </div>
      </div>
    </>
  );
};

export default CommandPalette;
