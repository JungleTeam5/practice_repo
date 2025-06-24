import React, { useEffect, useRef } from 'react';
import { TimelineClip } from '../types'; // 'types'에서 가져옴

interface ActiveClipInfo {
  clip: TimelineClip | null;
  localTime: number;
}

interface PreviewProps {
  activeClipInfo: ActiveClipInfo;
}

const Preview: React.FC<PreviewProps> = ({ activeClipInfo }) => {
  // ... 컴포넌트 내용은 이전과 동일 ...
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentSrcIdRef = useRef<string | null>(null); // src 대신 clip의 고유 id로 비교

  const { clip, localTime } = activeClipInfo;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (!clip) {
      // 활성 클립이 없으면 비디오 정지
      videoElement.src = '';
      currentSrcIdRef.current = null;
      return;
    }

    // 소스가 바뀌었을 때만 src를 업데이트하여 깜빡임 최소화
    if (currentSrcIdRef.current !== clip.id) {
      currentSrcIdRef.current = clip.id;
      videoElement.src = URL.createObjectURL(clip.media.file);
    }
    
    if (Math.abs(videoElement.currentTime - localTime) > 0.15) {
      videoElement.currentTime = localTime;
    }

  }, [clip, localTime]);

  return (
    <div className="preview panel">
      <h3>미리보기</h3>
      <video ref={videoRef} className="video-player" muted playsInline>
        {!clip && '타임라인을 재생하세요.'}
      </video>
    </div>
  );
}

export default Preview;