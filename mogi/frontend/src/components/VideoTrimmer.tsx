// /src/components/VideoTrimmer.tsx

import React, { useState, useRef, useEffect } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { TrimmerState, SourceVideo } from '../types';

// 부모로부터 받을 Props 타입 정의
interface VideoTrimmerProps {
  trimmerId: string;
  initialState: TrimmerState;
  onUpdate: (id: string, newState: Partial<Omit<TrimmerState, 'id'>>) => void;
}

const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ trimmerId, initialState, onUpdate }) => {
  const { sourceVideo, startTime, endTime } = initialState;

  // 이 컴포넌트 내부에서만 사용하는 상태들
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTimeInput, setStartTimeInput] = useState<string>('0.00');
  const [endTimeInput, setEndTimeInput] = useState<string>('0.00');

  const videoRef = useRef<HTMLVideoElement>(null);

  // 부모로부터 받은 상태(startTime, endTime)가 바뀌면 입력창의 문자열도 업데이트
  useEffect(() => {
    setStartTimeInput(startTime.toFixed(2));
  }, [startTime]);

  useEffect(() => {
    setEndTimeInput(endTime.toFixed(2));
  }, [endTime]);

  // 파일 업로드 시, 부모에게 상태 업데이트를 요청
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const videoURL = URL.createObjectURL(file);
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = videoURL;
      
      videoElement.onloadedmetadata = () => {
        const duration = videoElement.duration;
        // 부모에게 업데이트 알림
        onUpdate(trimmerId, {
          sourceVideo: { file, url: videoURL, duration },
          startTime: 0,
          endTime: duration,
        });
        setCurrentTime(0);
      };
    }
  };

  // 비디오 시간 업데이트 핸들러
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const newCurrentTime = videoRef.current.currentTime;
    if (newCurrentTime >= startTime && newCurrentTime <= endTime) {
      setCurrentTime(newCurrentTime);
    }
    if (newCurrentTime >= endTime) {
      if(videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = startTime;
      }
    }
  };

  // 구간 설정 슬라이더 핸들러: 부모에게 업데이트 알림
  const handleRangeChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      const newStartTime = value[0];
      const newEndTime = value[1];
      onUpdate(trimmerId, { startTime: newStartTime, endTime: newEndTime });
      
      if (currentTime < newStartTime || currentTime > newEndTime) {
        setCurrentTime(newStartTime);
        if (videoRef.current) videoRef.current.currentTime = newStartTime;
      }
    }
  };

  // 현재 시간 탐색 슬라이더 핸들러
  const handleCurrentTimeChange = (value: number | number[]) => {
    const newTime = Array.isArray(value) ? value[0] : value;
    const clampedTime = Math.max(startTime, Math.min(newTime, endTime));
    setCurrentTime(clampedTime);
    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime;
    }
  };

  // 입력창 핸들러
  const handleStartTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTimeInput(e.target.value);
  };
  const handleEndTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTimeInput(e.target.value);
  };
  const updateTimeOnBlur = () => {
    const newStart = parseFloat(startTimeInput);
    if (!isNaN(newStart) && newStart >= 0 && newStart < endTime) {
      onUpdate(trimmerId, { startTime: newStart });
    } else {
      setStartTimeInput(startTime.toFixed(2));
    }

    const newEnd = parseFloat(endTimeInput);
    if (sourceVideo && !isNaN(newEnd) && newEnd > startTime && newEnd <= sourceVideo.duration) {
      onUpdate(trimmerId, { endTime: newEnd });
    } else {
      setEndTimeInput(endTime.toFixed(2));
    }
  };

  return (
    <div className="trimmer-container">
      {!sourceVideo ? (
        <div className="upload-box">
          <label htmlFor={`file-upload-${trimmerId}`} className="custom-file-upload">파일 열기</label>
          <input id={`file-upload-${trimmerId}`} type="file" onChange={handleFileUpload} accept="video/*" />
        </div>
      ) : (
        <>
          <div className="preview-section">
            <video ref={videoRef} src={sourceVideo.url} controls onTimeUpdate={handleTimeUpdate} />
          </div>
          <div className="timeline-section">
            <div className="timeline-info">
              <div className="time-input-group">
                <label>시작</label>
                <input type="number" value={startTimeInput} onChange={handleStartTimeInputChange} onBlur={updateTimeOnBlur} step="0.1" min="0" />
                <span>s</span>
              </div>
              <div className="current-time-display">현재: {currentTime.toFixed(2)}s</div>
              <div className="time-input-group">
                <label>종료</label>
                <input type="number" value={endTimeInput} onChange={handleEndTimeInputChange} onBlur={updateTimeOnBlur} step="0.1" max={sourceVideo.duration} />
                <span>s</span>
              </div>
            </div>
            <div className="slider-stack">
              <Slider min={0} max={sourceVideo.duration} value={currentTime} disabled={true} className="base-track" />
              <Slider range min={0} max={sourceVideo.duration} value={[startTime, endTime]} onChange={handleRangeChange} step={0.1} allowCross={false} className="trim-range" />
              <Slider min={0} max={sourceVideo.duration} value={currentTime} onChange={handleCurrentTimeChange} step={0.1} className="seek-slider" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoTrimmer;