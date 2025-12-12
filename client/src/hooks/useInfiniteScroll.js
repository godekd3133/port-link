import { useState, useEffect, useCallback, useRef } from 'react';

export const useInfiniteScroll = (fetchMore, options = {}) => {
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  const threshold = options.threshold || 0.5;
  const rootMargin = options.rootMargin || '100px';

  const handleObserver = useCallback(
    async (entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading) {
        setLoading(true);
        try {
          const moreData = await fetchMore();
          if (!moreData || moreData.length === 0) {
            setHasMore(false);
          }
        } catch (error) {
          console.error('Failed to load more:', error);
        } finally {
          setLoading(false);
        }
      }
    },
    [fetchMore, hasMore, loading]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold,
      rootMargin,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold, rootMargin]);

  const reset = useCallback(() => {
    setHasMore(true);
    setLoading(false);
  }, []);

  return {
    loadMoreRef,
    loading,
    hasMore,
    reset,
  };
};

export default useInfiniteScroll;
