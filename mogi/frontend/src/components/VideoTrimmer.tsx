import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { TrimmerState, SourceVideo } from '../types';

export interface TrimmerRef {
  playVideo: () => void;
  pauseVideo: () => void;
  seekToStart: () => void;
}

interface VideoTrimmerProps {
  trimmerId: string;
  initialState: TrimmerState;
  onUpdate: (id: string, newState: Partial<Omit<TrimmerState, 'id'>>) => void;
}

const VideoTrimmer = forwardRef<TrimmerRef, VideoTrimmerProps>(({ trimmerId, initialState, onUpdate }, ref) => {
  const { sourceVideo, startTime, endTime } = initialState;

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTimeInput, setStartTimeInput] = useState<string>('0.00');
  const [endTimeInput, setEndTimeInput] = useState<string>('0.00');

  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    playVideo: () => {
      if(videoRef.current) {
        if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
          videoRef.current.currentTime = startTime;
        }
        videoRef.current.play();
      }
    },
    pauseVideo: () => {
      videoRef.current?.pause();
    },
    seekToStart: () => {
      if (videoRef.current) {
        // 비디오의 현재 재생 시간을 설정된 시작 시간으로 변경
        videoRef.current.currentTime = startTime;
        // UI 표시를 위해 컴포넌트의 현재 시간 상태도 업데이트
        setCurrentTime(startTime);
      }
    },
  }));

  useEffect(() => {
    setStartTimeInput(startTime.toFixed(2));
  }, [startTime]);

  useEffect(() => {
    setEndTimeInput(endTime.toFixed(2));
  }, [endTime]);
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const videoURL = URL.createObjectURL(file);
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = videoURL;
      
      videoElement.onloadedmetadata = () => {
        const duration = videoElement.duration;
        onUpdate(trimmerId, {
          sourceVideo: { file, url: videoURL, duration },
          startTime: 0,
          endTime: duration,
        });
        setCurrentTime(0);
      };
    }
  };

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

  const handleCurrentTimeChange = (value: number | number[]) => {
    const newTime = Array.isArray(value) ? value[0] : value;
    const clampedTime = Math.max(startTime, Math.min(newTime, endTime));
    setCurrentTime(clampedTime);
    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime;
    }
  };

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
});

export default VideoTrimmer;