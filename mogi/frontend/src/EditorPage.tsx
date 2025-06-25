// EditorPage.tsx

import React, { useState, useRef } from 'react';
import VideoTrimmer, { TrimmerRef } from './components/VideoTrimmer';
import { TrimmerState, SourceVideo, EQBand } from './types'; // EQBand 임포트

// 이퀄라이저 기본 설정 (예: 5-band EQ)
const defaultEQBands: EQBand[] = [
  { id: 'band1', frequency: 60, gain: 0 },    // Bass
  { id: 'band2', frequency: 250, gain: 0 },
  { id: 'band3', frequency: 1000, gain: 0 }, // Mid
  { id: 'band4', frequency: 4000, gain: 0 },
  { id: 'band5', frequency: 12000, gain: 0 }, // Treble
];

const EditorPage: React.FC = () => {
  const [trimmers, setTrimmers] = useState<TrimmerState[]>([
    {
      id: 'trimmer1',
      sourceVideo: null,
      startTime: 0,
      endTime: 0,
      equalizer: JSON.parse(JSON.stringify(defaultEQBands)), // 깊은 복사로 초기화
      volume: 1,
      aspectRatio: '16:9',
    },
    {
      id: 'trimmer2',
      sourceVideo: null,
      startTime: 0,
      endTime: 0,
      equalizer: JSON.parse(JSON.stringify(defaultEQBands)), // 깊은 복사로 초기화
      volume: 1,
      aspectRatio: '16:9',
    },
  ]);

  const trimmerRefs = useRef<Record<string, TrimmerRef | null>>({});

  const handleTrimmerUpdate = (id: string, newState: Partial<Omit<TrimmerState, 'id'>>) => {
    setTrimmers(prevTrimmers =>
      prevTrimmers.map(trimmer =>
        trimmer.id === id ? { ...trimmer, ...newState } : trimmer
      )
    );
  };

  const handleGlobalSave = async () => {
    const trimmer1Data = trimmers[0];
    const trimmer2Data = trimmers[1];

    if (!trimmer1Data.sourceVideo?.file || !trimmer2Data.sourceVideo?.file) {
      alert('두 개의 비디오를 모두 업로드해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('video1', trimmer1Data.sourceVideo.file);
    formData.append('video2', trimmer2Data.sourceVideo.file);

    const editData = {
      trimmer1: {
        startTime: trimmer1Data.startTime,
        endTime: trimmer1Data.endTime,
        equalizer: trimmer1Data.equalizer, // 이퀄라이저 데이터 추가
        volume: trimmer1Data.volume,
        aspectRatio: trimmer1Data.aspectRatio,
      },
      trimmer2: {
        startTime: trimmer2Data.startTime,
        endTime: trimmer2Data.endTime,
        equalizer: trimmer2Data.equalizer, // 이퀄라이저 데이터 추가
        volume: trimmer2Data.volume,
        aspectRatio: trimmer2Data.aspectRatio,
      },
    };
    formData.append('editData', JSON.stringify(editData));

    try {
      const response = await fetch('http://localhost:3000/videos/collage', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`서버 에러: ${response.statusText}`);
      }

      const resultBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `collage-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error("전송 실패:", error);
    }
  };

  const handleGlobalPlay = () => {
    Object.values(trimmerRefs.current).forEach(trimmerRef => {
      trimmerRef?.playVideo();
    });
  };

  const handleGlobalPause = () => {
    Object.values(trimmerRefs.current).forEach(trimmerRef => {
      trimmerRef?.pauseVideo();
    });
  };

  const handleGlobalSeekToStart = () => {
    Object.values(trimmerRefs.current).forEach(trimmerRef => {
      trimmerRef?.seekToStart();
    });
  };


  return (
    <div className="editor-page">
      <h1>듀얼 비디오 트리머 & 이퀄라이저</h1>
      <div className="trimmers-wrapper">
        {trimmers.map((trimmerState) => (
          <div key={trimmerState.id}>
            <VideoTrimmer
              ref={el => { trimmerRefs.current[trimmerState.id] = el; }}
              trimmerId={trimmerState.id}
              initialState={trimmerState}
              onUpdate={handleTrimmerUpdate}
            />
            <br/>
          </div>
        ))}
      </div>
      <div className="global-action-section">
        <button onClick={handleGlobalSeekToStart} className="global-action-button">
          재생 위치 초기화
        </button>
        <button onClick={handleGlobalPlay} className="global-action-button">
          동시 재생
        </button>
        <button onClick={handleGlobalPause} className="global-action-button">
          동시 정지
        </button>
        <button onClick={handleGlobalSave} className="global-save-button">
          전체 저장 및 콜라주 생성
        </button>
      </div>
    </div>
  );
}

export default EditorPage;