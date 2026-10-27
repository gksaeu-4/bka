# Book항이 (React)

시선 및 제스처 기반 맞춤형 독서 보조 서비스 — PDF 뷰어 프론트엔드.
`bookhang_mediapipe_frontend.html` 을 React(Vite)로 분리·이식한 프로젝트입니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173  (카메라는 localhost 또는 HTTPS에서만 동작)
npm run build
```

## 구조

```
src/
├─ App.jsx                  상태 총괄(문서/배율/회전/검색/시선/팝업)
├─ styles.css               원본 CSS 그대로 (id/class 유지)
├─ components/
│  ├─ Header.jsx            상단 바(테마, PDF 열기)
│  ├─ Sidebar.jsx           시선 카드 + 페이지 썸네일
│  ├─ Thumbnail.jsx         화면에 보일 때만 렌더링(IntersectionObserver)
│  ├─ Toolbar.jsx           페이지 이동·줌·회전·검색·인쇄·다운로드
│  ├─ SearchBar.jsx
│  ├─ PdfViewer.jsx         canvas + 텍스트 레이어 + 시선 오버레이 (ref.updateGaze)
│  ├─ WordPopup.jsx         단어 선택 시 뜻/해설/예시 팝업
│  ├─ StatusBar.jsx / DropOverlay.jsx
├─ hooks/
│  ├─ useGazeTracker.js     카메라 + MediaPipe Face Landmarker
│  ├─ usePdfSearch.js       문서 전체 검색(디바운스·취소 처리)
│  └─ useFileDrop.js        PDF 드래그&드롭
└─ lib/
   ├─ pdf.js                pdf.js 초기화/유틸
   ├─ gaze.js               홍채 기반 시선 추정·스무딩
   ├─ dictionary.js         ★ 단어 조회 어댑터 (백엔드 연동 지점)
   └─ text.js
```

## 연동 포인트

- **단어 사전/형태소 분석 API**: `lib/dictionary.js`의 `lookupWord(word)` 내부만 `fetch`로 교체하세요.
  반환 형태 `{ part, meaning, explanation, examples[] }` 를 유지하면 UI는 그대로 동작합니다.
- **시선 보정(calibration)**: `lib/gaze.js`의 `estimateGaze`가 현재는 고정 상수 기반 근사치입니다.
- **설정/도움말**: 지금은 `alert()` 데모입니다. `App.jsx`의 `onSettings`, `onHelp`에서 모달로 교체하면 됩니다.

## 원본과 달라진 점

- 시선 좌표는 프레임마다 들어오므로 React state를 거치지 않고 `PdfViewer`의 ref(`updateGaze`)로 DOM을 직접 갱신합니다(리렌더 방지).
- 검색: 입력 디바운스(250ms) + 이전 검색 취소 처리, 현재 페이지에서 검색어가 포함된 텍스트 조각을 노란색으로 표시(원본은 표시 없음).
- 썸네일: 원본은 전 페이지를 순차 렌더링, 여기서는 보이는 썸네일만 렌더링.
- 페이지/줌/회전 변경 시 단어 팝업이 자동으로 닫힘.
