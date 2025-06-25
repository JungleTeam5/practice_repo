import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { TrimmerState, SourceVideo, EQBand } from '../types'; // EQBand 임포트

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

// 이퀄라이저 UI 컴포넌트
const Equalizer: React.FC<{ bands: EQBand[], onGainChange: (bandId: string, newGain: number) => void }> = ({ bands, onGainChange }) => {
  return (
    <div className="equalizer-section">
      <h3>이퀄라이저</h3>
      <div className="equalizer-controls">
        {bands.map(band => (
          <div key={band.id} className="eq-band">
            <label>{band.frequency < 1000 ? `${band.frequency}Hz` : `${band.frequency/1000}kHz`}</label>
            <Slider
              vertical
              min={-12}
              max={12}
              step={0.5}
              value={band.gain}
              onChange={(value) => onGainChange(band.id, value as number)}
              className="eq-slider"
            />
            <span>{band.gain.toFixed(1)} dB</span>
          </div>
        ))}
      </div>
    </div>
  );
};


const VideoTrimmer = forwardRef<TrimmerRef, VideoTrimmerProps>(({ trimmerId, initialState, onUpdate }, ref) => {
  const { sourceVideo, startTime, endTime, equalizer } = initialState; // equalizer 상태 받기

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTimeInput, setStartTimeInput] = useState<string>('0.00');
  const [endTimeInput, setEndTimeInput] = useState<string>('0.00');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // 파일 입력을 위한 ref 추가
  
  // Web Audio API 관련 Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filterNodesRef = useRef<BiquadFilterNode[]>([]);

  // 비디오가 로드될 때 Web Audio API 설정
  useEffect(() => {
    if (sourceVideo && videoRef.current && !audioContextRef.current) {
      const context = new AudioContext();
      const source = context.createMediaElementSource(videoRef.current);
      
      const filters = equalizer.map(band => {
        const filter = context.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = band.frequency;
        filter.gain.value = band.gain;
        filter.Q.value = 1.41; // 적절한 Q 값
        return filter;
      });

      // 필터 체인 연결: source -> filter1 -> filter2 -> ... -> destination
      if (filters.length > 0) {
        source.connect(filters[0]);
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i+1]);
        }
        filters[filters.length - 1].connect(context.destination);
      } else {
        source.connect(context.destination);
      }

      audioContextRef.current = context;
      sourceNodeRef.current = source;
      filterNodesRef.current = filters;
    }
    
    // 컴포넌트 언마운트 시 오디오 컨텍스트 정리
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
        sourceNodeRef.current = null;
        filterNodesRef.current = [];
      }
    };
  }, [sourceVideo]); // sourceVideo가 변경될 때만 실행

  // 이퀄라이저 상태가 외부에서 변경되면 오디오 필터에 즉시 반영
  useEffect(() => {
    if (filterNodesRef.current.length === equalizer.length) {
      equalizer.forEach((band, index) => {
        if(filterNodesRef.current[index]) {
            filterNodesRef.current[index].gain.value = band.gain;
        }
      });
    }
  }, [equalizer]);

  useImperativeHandle(ref, () => ({
    playVideo: () => {
      if(videoRef.current) {
        // 오디오 컨텍스트가 정지 상태이면 재개
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
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
        videoRef.current.currentTime = startTime;
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
  
  // 숨겨진 파일 입력을 트리거하는 함수
  const handleTriggerFileUpload = () => {
    fileInputRef.current?.click();
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

  // 이퀄라이저 gain 값 변경 핸들러
  const handleEQGainChange = (bandId: string, newGain: number) => {
    const newBands = equalizer.map(band => 
      band.id === bandId ? { ...band, gain: newGain } : band
    );
    onUpdate(trimmerId, { equalizer: newBands });
  };

  return (
    <div className="trimmer-container">
      <input
        id={`file-upload-${trimmerId}`}
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/*"
        style={{ display: 'none' }}
      />

      {!sourceVideo ? (
        <div className="upload-box">
          <button onClick={handleTriggerFileUpload} className="custom-file-upload">파일 열기</button>
        </div>
      ) : (
        <>
          <div className="preview-section">
            <video ref={videoRef} src={sourceVideo.url} controls onTimeUpdate={handleTimeUpdate} crossOrigin="anonymous" />
            <div className="video-reselect-action">
              <button onClick={handleTriggerFileUpload}>비디오 변경</button>
            </div>
          </div>
          <div className="controls-wrapper">
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
            <Equalizer bands={equalizer} onGainChange={handleEQGainChange} />
          </div>
        </>
      )}
    </div>
  );
});

export default VideoTrimmer;