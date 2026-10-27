import { useEffect, useRef, useState } from 'react';
import { estimateGaze, smoothPoint } from '../lib/gaze.js';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// 모델은 한 번만 로드하고 재사용합니다(추적을 껐다 켜도 다시 받지 않음).
let landmarkerPromise = null;
function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
      });
    })().catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

/**
 * 카메라 + MediaPipe Face Landmarker로 시선(0..1 정규화 좌표)을 추정합니다.
 * - onPoint({x, y, confidence}) : 프레임마다 호출 (React state를 쓰지 않아 리렌더 없음)
 * - onPoint(null)               : 추적 종료 시 호출
 * - onStatus(label, message)    : 상태 표시용
 * - onError()                   : 카메라/모델 실패 시 호출 (호출 측에서 enabled를 끄세요)
 */
export function useGazeTracker({ enabled, videoRef, onPoint, onStatus, onError }) {
  const [cameraOn, setCameraOn] = useState(false);
  const cb = useRef({});
  cb.current = { onPoint, onStatus, onError };

  useEffect(() => {
    if (!enabled) return;

    const video = videoRef.current;
    let cancelled = false;
    let failed = false;
    let stream = null;
    let raf = 0;
    let lastTime = -1;
    let smoothed = null;
    const status = (label, message) => cb.current.onStatus?.(label, message);
    const fail = (label, message) => {
      failed = true;
      status(label, message);
      cb.current.onError?.();
    };

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        return fail('카메라 사용 불가', '카메라 접근은 HTTPS 또는 localhost 환경에서만 지원됩니다.');
      }
      try {
        status('카메라 연결 중', '카메라 권한을 허용해 주세요.');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setCameraOn(true);

        status('모델 로딩 중', 'MediaPipe 시선 추적 모델을 불러오는 중입니다.');
        const landmarker = await getLandmarker();
        if (cancelled) return;

        status('카메라 추적 중', 'MediaPipe 시선 추정 중 · 화면 보정 전 추정치입니다.');

        const loop = () => {
          if (cancelled) return;
          if (video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            try {
              const result = landmarker.detectForVideo(video, performance.now());
              const face = result.faceLandmarks?.[0];
              if (face) {
                const point = estimateGaze(face);
                if (point) {
                  smoothed = smoothPoint(smoothed, point, 0.28);
                  cb.current.onPoint?.({ ...smoothed, confidence: 0.65 });
                  status('카메라 추적 중', 'MediaPipe 시선 추정 중 · 화면 보정 전에는 위치가 부정확할 수 있습니다.');
                }
              } else {
                status('얼굴을 찾는 중', '얼굴과 눈이 카메라에 보이도록 위치를 조정해 주세요.');
              }
            } catch (err) {
              console.error('MediaPipe detection error:', err);
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        fail(
          '연결 실패',
          err?.name === 'NotAllowedError'
            ? '카메라 권한이 거부되었습니다. 브라우저 사이트 설정에서 카메라를 허용해 주세요.'
            : '카메라 또는 MediaPipe 모델에 연결할 수 없습니다. HTTPS/인터넷 연결을 확인해 주세요.'
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      setCameraOn(false);
      cb.current.onPoint?.(null);
      if (!failed) status('카메라 대기', '카메라 추적이 중지되었습니다.');
    };
  }, [enabled, videoRef]);

  return { cameraOn };
}
