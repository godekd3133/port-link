import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collaborationService } from '../services';
import './Collaborations.css';

const PROFESSION_LABELS = {
  DEVELOPER: '개발자',
  DESIGNER: '디자이너',
  PM: '기획자/PM',
  MARKETER: '마케터',
  DATA_ANALYST: '데이터 분석가',
  CONTENT_CREATOR: '콘텐츠 크리에이터',
  WRITER: '작가/카피라이터',
  PHOTOGRAPHER: '포토그래퍼',
  VIDEO_CREATOR: '영상 크리에이터',
  MUSICIAN: '뮤지션/작곡가',
  PLANNER: '전략기획',
  RESEARCHER: '연구원',
  CONSULTANT: '컨설턴트',
  EDUCATOR: '교육자',
  OTHER: '기타',
};

const STATUS_LABELS = {
  PENDING: '대기중',
  ACCEPTED: '수락됨',
  REJECTED: '거절됨',
  CANCELLED: '취소됨',
};

const STATUS_COLORS = {
  PENDING: 'status-pending',
  ACCEPTED: 'status-accepted',
  REJECTED: 'status-rejected',
  CANCELLED: 'status-cancelled',
};

const Collaborations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('received');
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchProfession, setSearchProfession] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [received, sent] = await Promise.all([
        collaborationService.getReceivedRequests(),
        collaborationService.getSentRequests(),
      ]);
      setReceivedRequests(received);
      setSentRequests(sent);
    } catch (error) {
      console.error('Failed to load collaboration requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && !searchProfession) return;

    setSearching(true);
    try {
      const results = await collaborationService.searchUsers({
        q: searchQuery.trim() || undefined,
        profession: searchProfession || undefined,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedUser || !requestMessage.trim()) return;

    setSendingRequest(true);
    try {
      await collaborationService.createRequest({
        receiverId: selectedUser.userId,
        message: requestMessage.trim(),
      });
      setShowRequestModal(false);
      setSelectedUser(null);
      setRequestMessage('');
      loadRequests();
      alert('협업 요청을 보냈습니다!');
    } catch (error) {
      console.error('Failed to send request:', error);
      alert(error.response?.data?.message || '요청 전송에 실패했습니다.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRespond = async (requestId, accept) => {
    setRespondingId(requestId);
    try {
      await collaborationService.respondToRequest(requestId, {
        accept,
        responseMessage: accept ? '협업을 수락합니다!' : undefined,
      });
      loadRequests();
    } catch (error) {
      console.error('Failed to respond:', error);
      alert('응답에 실패했습니다.');
    } finally {
      setRespondingId(null);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('협업 요청을 취소하시겠습니까?')) return;

    try {
      await collaborationService.cancelRequest(requestId);
      loadRequests();
    } catch (error) {
      console.error('Failed to cancel request:', error);
      alert('취소에 실패했습니다.');
    }
  };

  const openRequestModal = (userProfile) => {
    setSelectedUser(userProfile);
    setRequestMessage('');
    setShowRequestModal(true);
  };

  if (!user) {
    return (
      <div className="collaborations-page">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h4>로그인이 필요합니다</h4>
          <p>협업 기능을 사용하려면 먼저 로그인해주세요.</p>
          <Link to="/login" className="btn btn-primary">로그인하기</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="collaborations-loading">
        <div className="spinner" />
        <p>협업 정보를 불러오는 중...</p>
      </div>
    );
  }

  const pendingReceived = receivedRequests.filter(r => r.status === 'PENDING');

  return (
    <div className="collaborations-page">
      <div className="collaborations-header">
        <p className="eyebrow">Collaboration</p>
        <h1>협업 관리</h1>
        <p>함께 프로젝트를 만들어갈 동료를 찾고 관리하세요.</p>
      </div>

      {/* Stats Overview */}
      <div className="collab-stats">
        <div className="stat-item">
          <span className="stat-value">{pendingReceived.length}</span>
          <span className="stat-label">대기중인 요청</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{receivedRequests.filter(r => r.status === 'ACCEPTED').length}</span>
          <span className="stat-label">수락한 협업</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{sentRequests.length}</span>
          <span className="stat-label">보낸 요청</span>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <h2><span>🔍</span> 협업자 찾기</h2>
        <div className="search-form">
          <input
            type="text"
            placeholder="이름 또는 스킬로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <select
            value={searchProfession}
            onChange={(e) => setSearchProfession(e.target.value)}
          >
            <option value="">모든 직종</option>
            {Object.entries(PROFESSION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
            {searching ? '검색 중...' : '검색'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="search-results">
            <h3>검색 결과 ({searchResults.length}명)</h3>
            <div className="results-grid">
              {searchResults.map((profile) => (
                <div key={profile.id} className="user-card">
                  <div className="user-avatar">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.name} />
                    ) : (
                      <span>{profile.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="user-info">
                    <h4>{profile.name || '익명'}</h4>
                    <span className="profession-badge">
                      {PROFESSION_LABELS[profile.profession] || profile.profession}
                    </span>
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="user-skills">
                        {profile.skills.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="skill-tag">{skill}</span>
                        ))}
                        {profile.skills.length > 3 && (
                          <span className="skill-more">+{profile.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="user-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => navigate(`/profile/${profile.userId}`)}
                    >
                      프로필
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => openRequestModal(profile)}
                    >
                      협업 요청
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="requests-section">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            받은 요청
            {pendingReceived.length > 0 && (
              <span className="badge">{pendingReceived.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            보낸 요청
          </button>
        </div>

        {/* Received Requests */}
        {activeTab === 'received' && (
          <div className="requests-list">
            {receivedRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📬</div>
                <h4>받은 요청이 없습니다</h4>
                <p>다른 사용자들이 협업 요청을 보내면 여기에 표시됩니다.</p>
              </div>
            ) : (
              receivedRequests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-sender">
                    <div className="sender-avatar">
                      {request.sender?.profile?.avatarUrl ? (
                        <img src={request.sender.profile.avatarUrl} alt="" />
                      ) : (
                        <span>{request.sender?.profile?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="sender-info">
                      <h4>{request.sender?.profile?.name || '알 수 없음'}</h4>
                      <span className="profession">
                        {PROFESSION_LABELS[request.sender?.profile?.profession] || '직종 미설정'}
                      </span>
                    </div>
                    <span className={`status-badge ${STATUS_COLORS[request.status]}`}>
                      {STATUS_LABELS[request.status]}
                    </span>
                  </div>
                  <p className="request-message">{request.message}</p>
                  <div className="request-meta">
                    <span className="request-date">
                      {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  {request.status === 'PENDING' && (
                    <div className="request-actions">
                      <button
                        className="btn btn-success"
                        onClick={() => handleRespond(request.id, true)}
                        disabled={respondingId === request.id}
                      >
                        수락
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleRespond(request.id, false)}
                        disabled={respondingId === request.id}
                      >
                        거절
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Sent Requests */}
        {activeTab === 'sent' && (
          <div className="requests-list">
            {sentRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📤</div>
                <h4>보낸 요청이 없습니다</h4>
                <p>협업자를 검색하여 협업 요청을 보내보세요!</p>
              </div>
            ) : (
              sentRequests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-sender">
                    <div className="sender-avatar">
                      {request.receiver?.profile?.avatarUrl ? (
                        <img src={request.receiver.profile.avatarUrl} alt="" />
                      ) : (
                        <span>{request.receiver?.profile?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="sender-info">
                      <h4>{request.receiver?.profile?.name || '알 수 없음'}</h4>
                      <span className="profession">
                        {PROFESSION_LABELS[request.receiver?.profile?.profession] || '직종 미설정'}
                      </span>
                    </div>
                    <span className={`status-badge ${STATUS_COLORS[request.status]}`}>
                      {STATUS_LABELS[request.status]}
                    </span>
                  </div>
                  <p className="request-message">{request.message}</p>
                  <div className="request-meta">
                    <span className="request-date">
                      {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  {request.status === 'PENDING' && (
                    <div className="request-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        취소
                      </button>
                    </div>
                  )}
                  {request.responseMessage && (
                    <div className="response-message">
                      <span className="response-label">응답:</span>
                      {request.responseMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>협업 요청 보내기</h2>
            <div className="modal-user-info">
              <div className="user-avatar">
                {selectedUser.avatarUrl ? (
                  <img src={selectedUser.avatarUrl} alt={selectedUser.name} />
                ) : (
                  <span>{selectedUser.name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div>
                <h4>{selectedUser.name}</h4>
                <span className="profession-badge">
                  {PROFESSION_LABELS[selectedUser.profession] || selectedUser.profession}
                </span>
              </div>
            </div>
            <div className="form-group">
              <label>메시지</label>
              <textarea
                placeholder="어떤 프로젝트에 대해 협업하고 싶은지 간략히 설명해주세요..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRequestModal(false)}
              >
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendRequest}
                disabled={!requestMessage.trim() || sendingRequest}
              >
                {sendingRequest ? '보내는 중...' : '요청 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collaborations;
