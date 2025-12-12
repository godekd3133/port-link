import { useState, useCallback, createContext, useContext } from 'react';
import './MicroInteractions.css';

// ═══════════════════════════════════════════════════════════════════════════
// CONFETTI EFFECT
// ═══════════════════════════════════════════════════════════════════════════

const ConfettiContext = createContext(null);

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error('useConfetti must be used within a ConfettiProvider');
  }
  return context;
};

export const ConfettiProvider = ({ children }) => {
  const [confetti, setConfetti] = useState([]);

  const fireConfetti = useCallback((options = {}) => {
    const {
      particleCount = 50,
      spread = 60,
      origin = { x: 0.5, y: 0.5 },
      colors = ['#00F0FF', '#FF6B35', '#10B981', '#FBBF24', '#A855F7'],
    } = options;

    const particles = Array.from({ length: particleCount }, (_, i) => ({
      id: Date.now() + i,
      x: origin.x * 100,
      y: origin.y * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: (Math.random() - 0.5) * spread + 90,
      velocity: 30 + Math.random() * 30,
      rotation: Math.random() * 360,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    }));

    setConfetti(prev => [...prev, ...particles]);

    // Clean up after animation
    setTimeout(() => {
      setConfetti(prev => prev.filter(p => !particles.find(np => np.id === p.id)));
    }, 3000);
  }, []);

  return (
    <ConfettiContext.Provider value={{ fireConfetti }}>
      {children}
      {confetti.length > 0 && (
        <div className="confetti-container">
          {confetti.map(particle => (
            <div
              key={particle.id}
              className={`confetti-particle ${particle.shape}`}
              style={{
                '--x': `${particle.x}%`,
                '--y': `${particle.y}%`,
                '--color': particle.color,
                '--angle': `${particle.angle}deg`,
                '--velocity': particle.velocity,
                '--rotation': `${particle.rotation}deg`,
              }}
            />
          ))}
        </div>
      )}
    </ConfettiContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LIKE BUTTON WITH ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

export const LikeButton = ({
  liked = false,
  count = 0,
  onLike,
  size = 'medium',
  showCount = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState([]);

  const handleClick = () => {
    if (!liked) {
      setIsAnimating(true);
      // Create heart particles
      const newParticles = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        angle: (i * 60) + Math.random() * 30,
      }));
      setParticles(newParticles);

      setTimeout(() => {
        setIsAnimating(false);
        setParticles([]);
      }, 700);
    }

    onLike?.();
  };

  return (
    <button
      className={`like-button ${liked ? 'liked' : ''} ${isAnimating ? 'animating' : ''} size-${size}`}
      onClick={handleClick}
    >
      <span className="like-icon">{liked ? '❤️' : '🤍'}</span>
      {showCount && <span className="like-count">{count}</span>}

      {/* Heart particles */}
      {particles.map(p => (
        <span
          key={p.id}
          className="like-particle"
          style={{ '--angle': `${p.angle}deg` }}
        >
          ❤️
        </span>
      ))}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

export const TypingIndicator = ({ name }) => {
  return (
    <div className="typing-indicator">
      <span className="typing-name">{name}</span>
      <span className="typing-text">님이 입력 중</span>
      <span className="typing-dots">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUCCESS CHECKMARK
// ═══════════════════════════════════════════════════════════════════════════

export const SuccessCheckmark = ({ show = false }) => {
  if (!show) return null;

  return (
    <div className="success-checkmark">
      <div className="check-icon">
        <span className="icon-line line-tip"></span>
        <span className="icon-line line-long"></span>
        <div className="icon-circle"></div>
        <div className="icon-fix"></div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// RIPPLE BUTTON
// ═══════════════════════════════════════════════════════════════════════════

export const RippleButton = ({ children, className = '', onClick, ...props }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = {
      id: Date.now(),
      x,
      y,
      size: Math.max(rect.width, rect.height) * 2,
    };

    setRipples(prev => [...prev, ripple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id));
    }, 600);

    onClick?.(e);
  };

  return (
    <button className={`ripple-button ${className}`} onClick={handleClick} {...props}>
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple-effect"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BOUNCE ON HOVER
// ═══════════════════════════════════════════════════════════════════════════

export const BounceCard = ({ children, className = '' }) => {
  return (
    <div className={`bounce-card ${className}`}>
      {children}
    </div>
  );
};

export default ConfettiProvider;
