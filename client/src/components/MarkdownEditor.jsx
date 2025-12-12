import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { aiService } from '../services';
import './MarkdownEditor.css';

const AI_ACTIONS = [
  { id: 'improve', label: '개선하기', icon: '✨', desc: '더 전문적으로' },
  { id: 'expand', label: '확장하기', icon: '📝', desc: '더 상세하게' },
  { id: 'summarize', label: '요약하기', icon: '📋', desc: '간결하게' },
  { id: 'fix_grammar', label: '문법 교정', icon: '✏️', desc: '맞춤법/문법' },
  { id: 'make_professional', label: '전문적으로', icon: '💼', desc: '채용 어필' },
  { id: 'add_details', label: '기술 추가', icon: '🔧', desc: '기술 세부사항' },
  { id: 'generate_intro', label: '소개 생성', icon: '🚀', desc: '프로젝트 소개' },
  { id: 'generate_tech_desc', label: '기술 설명', icon: '💻', desc: '스택 설명' },
];

const MarkdownEditor = ({ value, onChange, placeholder, title, techStack }) => {
  const [mode, setMode] = useState('write');
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const textareaRef = useRef(null);

  const insertText = useCallback((before, after = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || placeholder;

    const newValue =
      value.substring(0, start) +
      before + selectedText + after +
      value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  const getSelectedText = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return '';
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    return value.substring(start, end);
  }, [value]);

  const handleAiAction = async (action) => {
    setShowAiMenu(false);
    setAiError('');

    const selectedText = getSelectedText();
    const contentToProcess = selectedText || value;

    if (!contentToProcess.trim()) {
      setAiError('처리할 텍스트가 없습니다.');
      return;
    }

    setAiLoading(true);

    try {
      const result = await aiService.assistWriting(contentToProcess, action, {
        title,
        techStack,
      });

      if (selectedText) {
        // 선택된 텍스트만 교체
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + result.result + value.substring(end);
        onChange(newValue);
      } else {
        // 전체 교체
        onChange(result.result);
      }
    } catch (error) {
      console.error('AI error:', error);
      setAiError(error.response?.data?.message || 'AI 처리 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  const toolbarActions = [
    { icon: 'H1', action: () => insertText('# ', '', '제목'), title: '제목 1' },
    { icon: 'H2', action: () => insertText('## ', '', '제목'), title: '제목 2' },
    { icon: 'H3', action: () => insertText('### ', '', '제목'), title: '제목 3' },
    { divider: true },
    { icon: 'B', action: () => insertText('**', '**', '굵게'), title: '굵게', bold: true },
    { icon: 'I', action: () => insertText('*', '*', '기울임'), title: '기울임', italic: true },
    { icon: '~', action: () => insertText('~~', '~~', '취소선'), title: '취소선' },
    { divider: true },
    { icon: '•', action: () => insertText('\n- ', '', '목록 항목'), title: '글머리 기호' },
    { icon: '1.', action: () => insertText('\n1. ', '', '목록 항목'), title: '번호 목록' },
    { icon: '☑', action: () => insertText('\n- [ ] ', '', '할 일'), title: '체크리스트' },
    { divider: true },
    { icon: '"', action: () => insertText('\n> ', '', '인용문'), title: '인용' },
    { icon: '<>', action: () => insertText('`', '`', 'code'), title: '인라인 코드' },
    { icon: '{ }', action: () => insertText('\n```javascript\n', '\n```', '// 코드를 입력하세요'), title: '코드 블록' },
    { divider: true },
    { icon: '🔗', action: () => insertText('[', '](url)', '링크 텍스트'), title: '링크' },
    { icon: '🖼', action: () => insertText('![', '](이미지URL)', '대체 텍스트'), title: '이미지' },
    { divider: true },
    { icon: '—', action: () => insertText('\n\n---\n\n', '', ''), title: '구분선' },
    { icon: '📊', action: () => insertText('\n| 열1 | 열2 | 열3 |\n|-----|-----|-----|\n| ', ' | 값 | 값 |\n', '값'), title: '테이블' },
  ];

  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: '1.5rem 0',
          borderRadius: '12px',
          fontSize: '0.9rem',
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  return (
    <div className="markdown-editor">
      <div className="editor-header">
        <div className="editor-tabs">
          <button
            className={`tab ${mode === 'write' ? 'active' : ''}`}
            onClick={() => setMode('write')}
          >
            ✏️ 작성
          </button>
          <button
            className={`tab ${mode === 'preview' ? 'active' : ''}`}
            onClick={() => setMode('preview')}
          >
            👁 미리보기
          </button>
          <button
            className={`tab ${mode === 'split' ? 'active' : ''}`}
            onClick={() => setMode('split')}
          >
            ⚡ 나란히
          </button>
        </div>

        {(mode === 'write' || mode === 'split') && (
          <div className="editor-toolbar">
            {toolbarActions.map((item, idx) =>
              item.divider ? (
                <span key={idx} className="toolbar-divider" />
              ) : (
                <button
                  key={idx}
                  type="button"
                  className={`toolbar-btn ${item.bold ? 'bold' : ''} ${item.italic ? 'italic' : ''}`}
                  onClick={item.action}
                  title={item.title}
                >
                  {item.icon}
                </button>
              )
            )}

            {/* AI Button */}
            <span className="toolbar-divider" />
            <div className="ai-menu-container">
              <button
                type="button"
                className={`toolbar-btn ai-btn ${aiLoading ? 'loading' : ''}`}
                onClick={() => setShowAiMenu(!showAiMenu)}
                disabled={aiLoading}
                title="AI 글쓰기 도우미"
              >
                {aiLoading ? '⏳' : '🤖'} AI
              </button>

              {showAiMenu && (
                <div className="ai-menu">
                  <div className="ai-menu-header">
                    <span>🤖 AI 글쓰기 도우미</span>
                    <small>텍스트를 선택하거나 전체 적용</small>
                  </div>
                  <div className="ai-menu-items">
                    {AI_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        className="ai-menu-item"
                        onClick={() => handleAiAction(action.id)}
                      >
                        <span className="ai-icon">{action.icon}</span>
                        <div className="ai-item-text">
                          <span className="ai-label">{action.label}</span>
                          <span className="ai-desc">{action.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {aiError && (
        <div className="ai-error">
          ⚠️ {aiError}
          <button onClick={() => setAiError('')}>×</button>
        </div>
      )}

      {aiLoading && (
        <div className="ai-loading-bar">
          <div className="ai-loading-progress"></div>
          <span>AI가 작성 중...</span>
        </div>
      )}

      <div className={`editor-content ${mode}`}>
        {(mode === 'write' || mode === 'split') && (
          <div className="editor-write">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || '마크다운으로 작성하세요...\n\n# 제목\n## 소제목\n\n**굵게** *기울임* ~~취소선~~\n\n- 목록 1\n- 목록 2\n\n```javascript\nconst hello = "world";\n```'}
            />
          </div>
        )}

        {(mode === 'preview' || mode === 'split') && (
          <div className="editor-preview">
            {value ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: CodeBlock,
                  h1: ({ node, ...props }) => <h1 className="md-h1" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="md-h2" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="md-h3" {...props} />,
                  h4: ({ node, ...props }) => <h4 className="md-h4" {...props} />,
                  p: ({ node, ...props }) => <p className="md-p" {...props} />,
                  a: ({ node, ...props }) => <a className="md-link" target="_blank" rel="noopener noreferrer" {...props} />,
                  ul: ({ node, ...props }) => <ul className="md-ul" {...props} />,
                  ol: ({ node, ...props }) => <ol className="md-ol" {...props} />,
                  li: ({ node, ...props }) => <li className="md-li" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="md-blockquote" {...props} />,
                  hr: ({ node, ...props }) => <hr className="md-hr" {...props} />,
                  table: ({ node, ...props }) => <div className="md-table-wrapper"><table className="md-table" {...props} /></div>,
                  img: ({ node, ...props }) => <img className="md-img" loading="lazy" {...props} />,
                  input: ({ node, ...props }) => <input className="md-checkbox" {...props} />,
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <div className="preview-placeholder">
                <span>👀</span>
                <p>작성한 내용이 여기에 표시됩니다</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;
