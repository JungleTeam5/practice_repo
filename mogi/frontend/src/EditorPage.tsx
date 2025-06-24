import React, { useState } from 'react';
import VideoTrimmer from './components/VideoTrimmer';
import { TrimmerState, SourceVideo } from './types';

const EditorPage: React.FC = () => {
  const [trimmers, setTrimmers] = useState<TrimmerState[]>([
    { id: 'trimmer1', sourceVideo: null, startTime: 0, endTime: 0 },
    { id: 'trimmer2', sourceVideo: null, startTime: 0, endTime: 0 },
  ]);

  const handleTrimmerUpdate = (id: string, newState: Partial<Omit<TrimmerState, 'id'>>) => {
    setTrimmers(prevTrimmers =>
      prevTrimmers.map(trimmer =>
        trimmer.id === id ? { ...trimmer, ...newState } : trimmer
      )
    );
  };
  
  // --- 핵심 수정 부분 ---
  const handleGlobalSave = async () => {
    const trimmer1Data = trimmers[0];
    const trimmer2Data = trimmers[1];

    // 1. 두 트리머에 영상 파일이 모두 있는지 확인
    if (!trimmer1Data.sourceVideo?.file || !trimmer2Data.sourceVideo?.file) {
      alert('두 개의 비디오를 모두 업로드해주세요.');
      return;
    }

    // 2. FormData 객체 생성
    const formData = new FormData();

    // 3. 각 파일을 'video1', 'video2'라는 필드 이름으로 FormData에 추가
    formData.append('video1', trimmer1Data.sourceVideo.file);
    formData.append('video2', trimmer2Data.sourceVideo.file);

    // 4. 편집 정보(JSON)를 문자열로 만들어 'editData' 필드로 추가
    const editData = {
      trimmer1: {
        startTime: trimmer1Data.startTime,
        endTime: trimmer1Data.endTime,
      },
      trimmer2: {
        startTime: trimmer2Data.startTime,
        endTime: trimmer2Data.endTime,
      },
    };
    formData.append('editData', JSON.stringify(editData));

    console.log(formData);

    // 5. 서버로 FormData 전송
    try {
      
      // fetch를 사용하여 multipart/form-data 전송
      const response = await fetch('http://localhost:3000/videos/collage', { // NestJS 엔드포인트 경로
        method: 'POST',
        // 중요: FormData를 보낼 때는 Content-Type 헤더를 명시하지 않습니다.
        // 브라우저가 자동으로 올바른 Content-Type과 boundary를 설정해 줍니다.
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`서버 에러: ${response.statusText}`);
      }

      // 성공 시, 결과 파일을 스트리밍으로 받거나 다운로드 처리
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

  return (
    <div className="editor-page">
      <h1>듀얼 비디오 트리머</h1>
      <div className="trimmers-wrapper">
        {trimmers.map((trimmerState) => (
          <VideoTrimmer
            key={trimmerState.id}
            trimmerId={trimmerState.id}
            initialState={trimmerState}
            onUpdate={handleTrimmerUpdate}
          />
        ))}
      </div>
      <div className="global-action-section">
        <button onClick={handleGlobalSave} className="global-save-button">
          전체 저장 및 콜라주 생성
        </button>
      </div>
    </div>
  );
}

export default EditorPage;