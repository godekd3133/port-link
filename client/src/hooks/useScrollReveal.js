import { useEffect, useRef, useState } from 'react';

export const useScrollReveal = (options = {}) => {
  const ref = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          if (options.once !== false) {
            observer.unobserve(element);
          }
        } else if (options.once === false) {
          setIsRevealed(false);
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px 0px -50px 0px',
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin, options.once]);

  return { ref, isRevealed };
};

export const useMultipleScrollReveal = (count, options = {}) => {
  const refs = useRef([]);
  const [revealed, setRevealed] = useState(new Array(count).fill(false));

  useEffect(() => {
    const observers = refs.current.map((element, index) => {
      if (!element) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setRevealed((prev) => {
              const newRevealed = [...prev];
              newRevealed[index] = true;
              return newRevealed;
            });
            if (options.once !== false) {
              observer.unobserve(element);
            }
          }
        },
        {
          threshold: options.threshold || 0.1,
          rootMargin: options.rootMargin || '0px 0px -50px 0px',
        }
      );

      observer.observe(element);
      return observer;
    });

    return () => observers.forEach((obs) => obs?.disconnect());
  }, [count, options.threshold, options.rootMargin, options.once]);

  const setRef = (index) => (el) => {
    refs.current[index] = el;
  };

  return { setRef, revealed };
};

export default useScrollReveal;
