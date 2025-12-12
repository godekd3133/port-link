const Skeleton = ({ variant = 'text', width, height, className = '', count = 1 }) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'avatar':
        return 'skeleton-avatar';
      case 'title':
        return 'skeleton-title';
      case 'card':
        return 'skeleton-card';
      case 'text':
      default:
        return 'skeleton-text';
    }
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={`skeleton ${getVariantClass()} ${className}`}
            style={style}
          />
        ))}
      </>
    );
  }

  return <div className={`skeleton ${getVariantClass()} ${className}`} style={style} />;
};

export const SkeletonCard = () => (
  <div className="skeleton-card-wrapper">
    <Skeleton variant="card" />
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <Skeleton variant="avatar" />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height="14px" />
          <Skeleton width="40%" height="12px" />
        </div>
      </div>
      <Skeleton variant="title" />
      <Skeleton count={2} />
    </div>
  </div>
);

export const SkeletonPost = () => (
  <div className="card" style={{ padding: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <Skeleton variant="avatar" />
      <div style={{ flex: 1 }}>
        <Skeleton width="120px" height="16px" />
        <Skeleton width="80px" height="12px" />
      </div>
    </div>
    <Skeleton variant="title" />
    <Skeleton count={3} />
    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
      <Skeleton width="60px" height="28px" style={{ borderRadius: '14px' }} />
      <Skeleton width="80px" height="28px" style={{ borderRadius: '14px' }} />
      <Skeleton width="70px" height="28px" style={{ borderRadius: '14px' }} />
    </div>
  </div>
);

export default Skeleton;
