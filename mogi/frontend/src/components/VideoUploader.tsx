// src/components/VideoUploader.tsx
import React, { useState, useRef } from 'react';
import axios from 'axios';

const VideoUploader: React.FC = () => {
  const [video1, setVideo1] = useState<File | null>(null);
  const [video2, setVideo2] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);

  // 이전에 생성된 Object URL을 해제하기 위해 Ref 사용
  const videoUrlRef = useRef<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, videoNumber: 1 | 2) => {
    const file = e.target.files?.[0] || null;
    if (videoNumber === 1) {
      setVideo1(file);
    } else {
      setVideo2(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!video1 || !video2) {
      setError('영상 파일 2개를 모두 선택해주세요.');
      return;
    }

    // 이전 결과 비디오 URL 해제
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
    }
    
    setIsLoading(true);
    setError(null);
    setResultVideoUrl(null);

    const formData = new FormData();
    formData.append('video1', video1);
    formData.append('video2', video2);

    try {
      const response = await axios.post('http://localhost:3000/videos/collage', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // 서버에서 비디오 파일을 스트리밍으로 보내주므로, 응답 타입을 'blob'으로 설정해야 합니다.
        responseType: 'blob', 
      });

      // Blob 데이터를 비디오 태그에서 사용할 수 있는 URL로 변환
      const videoBlob = new Blob([response.data], { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);
      setResultVideoUrl(url);
      videoUrlRef.current = url; // 나중에 해제하기 위해 URL 저장

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '업로드 또는 처리 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <h1>영상 콜라주 만들기</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="video1">영상 1: </label>
          <input
            id="video1"
            type="file"
            accept="video/*"
            onChange={(e) => handleFileChange(e, 1)}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="video2">영상 2: </label>
          <input
            id="video2"
            type="file"
            accept="video/*"
            onChange={(e) => handleFileChange(e, 2)}
          />
        </div>
        <button type="submit" disabled={isLoading || !video1 || !video2}>
          {isLoading ? '처리 중...' : '콜라주 생성 및 업로드'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>에러: {error}</p>}

      {isLoading && <p>서버에서 영상을 처리하고 있습니다. 잠시만 기다려주세요...</p>}

      {resultVideoUrl && (
        <div style={{ marginTop: '30px' }}>
          <h2>결과 영상</h2>
          <video src={resultVideoUrl} controls width="100%" />
          <a href={resultVideoUrl} download={`collage-${Date.now()}.mp4`}>
             결과 영상 다운로드
          </a>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;