const DEFAULT_SUBTITLE = '시선 및 제스처 기반 맞춤형 독서 보조 서비스';

export default function Header({ fileName, onOpen, onToggleTheme, onSettings, onHelp }) {
  return (
    <header>
      <div className="brand">
        <span className="logo">📖</span>
        <span>Book항이</span>
      </div>
      <div className="filename" id="filename" title={fileName || undefined}>
        {fileName || DEFAULT_SUBTITLE}
      </div>
      <div className="header-actions">
        <button className="top-link active">전자책 뷰어</button>
        <button className="top-link" onClick={onSettings}>설정</button>
        <button className="top-link" onClick={onHelp}>도움말</button>
        <button id="openBtn" className="primary" onClick={onOpen}>＋ PDF 열기</button>
        <button id="themeBtn" title="다크 모드 전환" aria-label="다크 모드 전환" onClick={onToggleTheme}>◐</button>
      </div>
    </header>
  );
}
