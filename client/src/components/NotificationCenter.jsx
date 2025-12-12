import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import './NotificationCenter.css';

// Notification Context
const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification Types
const NOTIFICATION_ICONS = {
  like: '❤️',
  comment: '💬',
  follow: '👤',
  mention: '@',
  system: '🔔',
  achievement: '🏆',
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('portlink-notifications');
    return saved ? JSON.parse(saved) : [
      // Demo notifications
      {
        id: 1,
        type: 'like',
        title: '새로운 좋아요',
        message: '김개발님이 회원님의 게시글을 좋아합니다',
        time: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        read: false,
        link: '/posts/1',
      },
      {
        id: 2,
        type: 'comment',
        title: '새 댓글',
        message: '이코드님이 댓글을 남겼습니다: "정말 유용한 정보네요!"',
        time: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        read: false,
        link: '/posts/1',
      },
      {
        id: 3,
        type: 'follow',
        title: '새로운 팔로워',
        message: '박프론트님이 회원님을 팔로우합니다',
        time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        read: true,
        link: '/profile/2',
      },
      {
        id: 4,
        type: 'achievement',
        title: '업적 달성! 🎉',
        message: '"첫 게시글 작성" 업적을 달성했습니다',
        time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        read: true,
      },
    ];
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('portlink-notifications', JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      time: new Date().toISOString(),
      read: false,
      ...notification,
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Time ago helper
const timeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return '방금 전';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
  return date.toLocaleDateString('ko-KR');
};

// Notification Bell Component
export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      window.location.hash = notification.link;
    }
    setIsOpen(false);
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="알림"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>알림</h3>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={markAllAsRead}>
                모두 읽음
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span>🔔</span>
                <p>알림이 없습니다</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {NOTIFICATION_ICONS[notification.type] || '🔔'}
                  </div>
                  <div className="notification-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{timeAgo(notification.time)}</span>
                  </div>
                  <button
                    className="notification-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button onClick={() => setIsOpen(false)}>닫기</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationProvider;
