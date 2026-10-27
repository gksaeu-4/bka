import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Toolbar from './components/Toolbar.jsx';
import SearchBar from './components/SearchBar.jsx';
import PdfViewer from './components/PdfViewer.jsx';
import WordPopup from './components/WordPopup.jsx';
import StatusBar from './components/StatusBar.jsx';
import DropOverlay from './components/DropOverlay.jsx';
import { SCALE, clamp, isPdfFile, openPdf } from './lib/pdf.js';
import { usePdfSearch } from './hooks/usePdfSearch.js';
import { useGazeTracker } from './hooks/useGazeTracker.js';
import { useFileDrop } from './hooks/useFileDrop.js';

export default function App() {
  // ---------- 문서 / 뷰 상태 ----------
  const [pdfDoc, setPdfDoc] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState('준비됨 · 프론트엔드 데모');
  const [selection, setSelection] = useState(null); // { word, rect }

  // ---------- 시선 추적 상태 ----------
  const [gazeEnabled, setGazeEnabled] = useState(false);
  const [gazeLabel, setGazeLabel] = useState('데모 모드');

  const fileInputRef = useRef(null);
  const stageRef = useRef(null);
  const viewerRef = useRef(null);
  const videoRef = useRef(null);
  const pageTextsRef = useRef([]);

  const totalPages = pdfDoc?.numPages ?? 0;

  // ---------- 검색 ----------
  const search = usePdfSearch({ pdfDoc, pageTextsRef, onStatus: setStatus });
  useEffect(() => {
    if (search.current) setPage(search.current.page);
  }, [search.current]);

  // ---------- 시선 ----------
  const handleGazeStatus = useCallback((label, message) => {
    setGazeLabel(label);
    setStatus(message);
  }, []);
  const { cameraOn } = useGazeTracker({
    enabled: gazeEnabled,
    videoRef,
    onPoint: (p) => viewerRef.current?.updateGaze(p),
    onStatus: handleGazeStatus,
    onError: () => setGazeEnabled(false),
  });

  // ---------- 파일 ----------
  const loadFile = useCallback(async (file) => {
    if (!isPdfFile(file)) { setStatus('PDF 파일을 선택해 주세요.'); return; }
    try {
      setStatus('PDF 불러오는 중…');
      const pdf = await openPdf(file);
      pageTextsRef.current = new Array(pdf.numPages);
      search.reset();
      setPdfDoc(pdf);
      setFileName(file.name);
      setFileUrl(URL.createObjectURL(file));
      setPage(1);
      setScale(1);
      setRotation(0);
    } catch (err) {
      console.error(err);
      setStatus('PDF를 열 수 없습니다. 파일이 손상되었거나 암호화되었을 수 있습니다.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseFile = () => fileInputRef.current?.click();
  const dragging = useFileDrop(loadFile);

  // 이전 문서/URL 정리
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);
  useEffect(() => () => { try { pdfDoc?.destroy(); } catch { /* noop */ } }, [pdfDoc]);

  // 테마
  useEffect(() => { document.body.classList.toggle('dark', dark); }, [dark]);

  // 페이지/배율/회전이 바뀌면 단어 팝업 닫기
  useEffect(() => setSelection(null), [page, scale, rotation, pdfDoc]);
  const closePopup = useCallback(() => setSelection(null), []);

  // ---------- 동작 ----------
  const goToPage = useCallback(
    (n) => { if (pdfDoc) setPage(clamp(n, 1, pdfDoc.numPages)); },
    [pdfDoc]
  );
  const zoom = (delta) => setScale((s) => clamp(s + delta, SCALE.min, SCALE.max));
  const fitWidth = async () => {
    if (!pdfDoc || !stageRef.current) return;
    const p = await pdfDoc.getPage(page);
    const vp = p.getViewport({ scale: 1, rotation });
    setScale(clamp((stageRef.current.clientWidth - 52) / vp.width, SCALE.min, SCALE.fitMax));
  };
  const fitHeight = async () => {
    if (!pdfDoc || !stageRef.current) return;
    const p = await pdfDoc.getPage(page);
    const vp = p.getViewport({ scale: 1, rotation });
    // 페이지 아래 그림자(12px) 등을 고려해 약간의 여유를 둡니다.
    setScale(clamp((stageRef.current.clientHeight - 24) / vp.height, SCALE.min, SCALE.fitMax));
  };
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setStatus('전체 화면을 사용할 수 없습니다.');
    }
  };
  const download = () => {
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const print = () => {
    if (!fileUrl) return;
    const win = window.open(fileUrl, '_blank');
    setStatus(win ? '열린 PDF 창에서 인쇄를 실행하세요.' : '팝업이 차단되었습니다. 다운로드 후 PDF를 인쇄해 주세요.');
  };

  // 시선 추적 끄면 오버레이 숨김 (useGazeTracker 정리 단계에서도 onPoint(null) 호출)
  const toggleGaze = () => setGazeEnabled((v) => !v);

  // ---------- 단축키 ----------
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches?.('input')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'ArrowLeft') goToPage(page - 1);
      if (e.key === 'ArrowRight') goToPage(page + 1);
      if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); chooseFile(); }
      if (mod && e.key.toLowerCase() === 'f' && pdfDoc) { e.preventDefault(); search.setOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [page, pdfDoc, goToPage, search.setOpen]);

  return (
    <>
      <div className="app">
        <Header
          fileName={fileName}
          onOpen={chooseFile}
          onToggleTheme={() => setDark((v) => !v)}
          onSettings={() => alert('설정 화면은 프론트엔드 데모입니다. 추후 시선 민감도와 글꼴·테마 설정을 연결할 수 있어요.')}
          onHelp={() => alert('PDF를 연 뒤 텍스트를 드래그해 단어를 선택하세요. 추적 시작을 누르면 카메라 권한을 요청하고 MediaPipe Face Landmarker로 시선을 추정합니다. 시선 보정 전에는 추정 위치가 부정확할 수 있습니다.')}
        />

        <div className="workspace">
          <Sidebar
            pdfDoc={pdfDoc}
            page={page}
            onPageSelect={setPage}
            collapsed={!sidebarOpen}
            onToggleCollapse={() => setSidebarOpen((v) => !v)}
            gaze={{ enabled: gazeEnabled, label: gazeLabel, cameraOn, videoRef, onToggle: toggleGaze }}
          />

          <main className="viewer">
            <Toolbar
              hasDoc={!!pdfDoc}
              page={page}
              totalPages={totalPages}
              scale={scale}
              onPageChange={goToPage}
              onZoomIn={() => zoom(SCALE.step)}
              onZoomOut={() => zoom(-SCALE.step)}
              onFit={fitWidth}
              onFitHeight={fitHeight}
              onRotate={() => setRotation((r) => (r + 90) % 360)}
              onToggleSearch={search.toggle}
              onFullscreen={toggleFullscreen}
              onPrint={print}
              onDownload={download}
            />
            <SearchBar search={search} />
            <PdfViewer
              ref={viewerRef}
              stageRef={stageRef}
              pdfDoc={pdfDoc}
              pageNumber={page}
              scale={scale}
              rotation={rotation}
              highlightTerm={search.term}
              onOpen={chooseFile}
              onPageText={(n, text) => { pageTextsRef.current[n - 1] = text; }}
              onRendered={(n) => setStatus(`페이지 ${n} / ${totalPages} · 텍스트를 드래그해 단어를 선택하세요`)}
              onSelectText={setSelection}
            />
          </main>
        </div>

        <StatusBar status={status} />
      </div>

      <WordPopup selection={selection} stageRef={stageRef} onClose={closePopup} />
      <input
        ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = '';
        }}
      />
      <DropOverlay visible={dragging} />
    </>
  );
}
