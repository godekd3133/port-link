import { useState, useEffect, useCallback } from 'react';
import './Lightbox.css';

// Lightbox Context for global access
import { createContext, useContext } from 'react';

const LightboxContext = createContext(null);

export const useLightbox = () => {
  const context = useContext(LightboxContext);
  if (!context) {
    throw new Error('useLightbox must be used within a LightboxProvider');
  }
  return context;
};

export const LightboxProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = useCallback((imageList, startIndex = 0) => {
    setImages(Array.isArray(imageList) ? imageList : [imageList]);
    setCurrentIndex(startIndex);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = '';
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowRight':
          next();
          break;
        case 'ArrowLeft':
          prev();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, next, prev]);

  return (
    <LightboxContext.Provider value={{ open, close }}>
      {children}
      {isOpen && (
        <div className="lightbox-overlay" onClick={close}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button className="lightbox-close" onClick={close}>
              ✕
            </button>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button className="lightbox-nav lightbox-prev" onClick={prev}>
                  ‹
                </button>
                <button className="lightbox-nav lightbox-next" onClick={next}>
                  ›
                </button>
              </>
            )}

            {/* Image */}
            <div className="lightbox-image-wrapper">
              <img
                src={images[currentIndex]?.src || images[currentIndex]}
                alt={images[currentIndex]?.alt || `Image ${currentIndex + 1}`}
                className="lightbox-image"
              />
            </div>

            {/* Caption & Counter */}
            <div className="lightbox-footer">
              {images[currentIndex]?.caption && (
                <p className="lightbox-caption">{images[currentIndex].caption}</p>
              )}
              {images.length > 1 && (
                <span className="lightbox-counter">
                  {currentIndex + 1} / {images.length}
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="lightbox-thumbnails">
                {images.map((img, index) => (
                  <button
                    key={index}
                    className={`lightbox-thumb ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <img src={img?.src || img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </LightboxContext.Provider>
  );
};

// Clickable Image Component
export const LightboxImage = ({ src, alt, caption, className = '', group = [] }) => {
  const { open } = useLightbox();

  const handleClick = () => {
    if (group.length > 0) {
      const index = group.findIndex(img => (img.src || img) === src);
      open(group, index >= 0 ? index : 0);
    } else {
      open({ src, alt, caption });
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      className={`lightbox-trigger ${className}`}
      onClick={handleClick}
      style={{ cursor: 'zoom-in' }}
    />
  );
};

export default LightboxProvider;
