import React, { useState, useRef, useEffect } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

// 컴포넌트 내에서 사용할 타입 정의
interface SourceVideo {
  file: File;
  url: string;
  duration: number;
}

const VideoTrimmer: React.FC = () => {
  // --- 1. 상태(State) 및 Ref 정의 ---
  const [sourceVideo, setSourceVideo] = useState<SourceVideo | null>(null);
  
  // 실제 시간 값 (number)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // 입력창 표시를 위한 별도의 '문자열' 상태
  const [startTimeInput, setStartTimeInput] = useState<string>('0.00');
  const [endTimeInput, setEndTimeInput] = useState<string>('0.00');

  const videoRef = useRef<HTMLVideoElement>(null);

  // --- 2. 동기화를 위한 useEffect Hooks ---

  // 슬라이더 등으로 실제 startTime(숫자)이 바뀌면 -> 입력창 문자열 업데이트
  useEffect(() => {
    setStartTimeInput(startTime.toFixed(2));
  }, [startTime]);

  // 슬라이더 등으로 실제 endTime(숫자)이 바뀌면 -> 입력창 문자열 업데이트
  useEffect(() => {
    setEndTimeInput(endTime.toFixed(2));
  }, [endTime]);


  // --- 3. 이벤트 핸들러 및 로직 ---

  // 파일 업로드 시 모든 시간 상태 초기화
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const videoURL = URL.createObjectURL(file);
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = videoURL;
      
      videoElement.onloadedmetadata = () => {
        const duration = videoElement.duration;
        setSourceVideo({ file, url: videoURL, duration });
        setStartTime(0);
        setEndTime(duration);
        setCurrentTime(0);
        // 입력창 상태도 함께 초기화
        setStartTimeInput('0.00');
        setEndTimeInput(duration.toFixed(2));
      };
    }
  };
  
  // 비디오 재생 시간이 변경될 때마다 실행
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const newCurrentTime = videoRef.current.currentTime;
    
    // 현재 시간이 선택된 구간 안에 있을 때만 상태 업데이트
    if (newCurrentTime >= startTime && newCurrentTime <= endTime) {
      setCurrentTime(newCurrentTime);
    }
    
    // 재생 시간이 끝나는 지점을 넘어가면, 시작 지점으로 되돌리고 정지
    if (newCurrentTime >= endTime) {
      if(videoRef.current){
        videoRef.current.pause();
        videoRef.current.currentTime = startTime; 
      }
    }
  };

  // 구간 설정(Trim) 슬라이더 값 변경 핸들러
  const handleRangeChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      const newStartTime = value[0];
      const newEndTime = value[1];
      setStartTime(newStartTime);
      setEndTime(newEndTime);
      
      if (currentTime < newStartTime) {
        setCurrentTime(newStartTime);
        if (videoRef.current) videoRef.current.currentTime = newStartTime;
      } else if (currentTime > newEndTime) {
        setCurrentTime(newEndTime);
        if (videoRef.current) videoRef.current.currentTime = newEndTime;
      }
    }
  };

  // 현재 시간 탐색(Seek) 슬라이더 값 변경 핸들러
  const handleCurrentTimeChange = (value: number | number[]) => {
    const newTime = Array.isArray(value) ? value[0] : value;
    const clampedTime = Math.max(startTime, Math.min(newTime, endTime));
    setCurrentTime(clampedTime);
    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime;
    }
  };

  // 시작 시간 숫자 입력 핸들러 (문자열 상태만 변경)
  const handleStartTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTimeInput(e.target.value);
  };

  // 종료 시간 숫자 입력 핸들러 (문자열 상태만 변경)
  const handleEndTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTimeInput(e.target.value);
  };
  
  // 입력창에서 포커스가 벗어났을 때 실제 시간 값 업데이트
  const updateTimeOnBlur = () => {
    const newStart = parseFloat(startTimeInput);
    if (!isNaN(newStart) && newStart >= 0 && newStart < endTime) {
      setStartTime(newStart);
    } else {
      setStartTimeInput(startTime.toFixed(2));
    }

    const newEnd = parseFloat(endTimeInput);
    if (sourceVideo && !isNaN(newEnd) && newEnd > startTime && newEnd <= sourceVideo.duration) {
      setEndTime(newEnd);
    } else {
      setEndTimeInput(endTime.toFixed(2));
    }
  };

  // 저장(내보내기) 핸들러
  const handleSave = () => {
    if (!sourceVideo) return;
    alert(`서버로 저장 요청!
      파일명: ${sourceVideo.file.name}
      시작 시간: ${startTime.toFixed(2)}s
      종료 시간: ${endTime.toFixed(2)}s
      (지속 시간: ${(endTime - startTime).toFixed(2)}s)
    `);
    // 실제 서버 요청 로직
    // fetch('/api/videos/trim', {
    //   method: 'POST',
    //   body: JSON.stringify({ startTime, endTime, fileName: sourceVideo.file.name })
    // });
  };


  // --- 4. JSX 렌더링 ---
  return (
    <div className="trimmer-container">
      {!sourceVideo ? (
        <div className="upload-box">
          <label htmlFor="file-upload" className="custom-file-upload">파일 열기</label>
          <input id="file-upload" type="file" onChange={handleFileUpload} accept="video/*" />
        </div>
      ) : (
        <>
          <div className="preview-section">
            <video 
              ref={videoRef} 
              src={sourceVideo.url} 
              controls 
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          <div className="timeline-section">
            <div className="timeline-info">
                <div className="time-input-group">
                    <label>시작</label>
                    <input 
                      type="number"
                      value={startTimeInput}
                      onChange={handleStartTimeInputChange}
                      onBlur={updateTimeOnBlur}
                      step="0.1"
                      min="0"
                    />
                    <span>s</span>
                </div>
                <div className="current-time-display">
                    현재: {currentTime.toFixed(2)}s
                </div>
                <div className="time-input-group">
                    <label>종료</label>
                    <input 
                      type="number"
                      value={endTimeInput}
                      onChange={handleEndTimeInputChange}
                      onBlur={updateTimeOnBlur}
                      step="0.1"
                      max={sourceVideo.duration}
                    />
                    <span>s</span>
                </div>
            </div>
            
            <div className="slider-stack">
              <Slider
                min={0}
                max={sourceVideo.duration}
                value={currentTime}
                disabled={true}
                className="base-track"
              />
              <Slider
                range
                min={0}
                max={sourceVideo.duration}
                value={[startTime, endTime]}
                onChange={handleRangeChange}
                step={0.1}
                allowCross={false}
                className="trim-range"
              />
              <Slider
                min={0}
                max={sourceVideo.duration}
                value={currentTime}
                onChange={handleCurrentTimeChange}
                step={0.1}
                className="seek-slider"
              />
            </div>
          </div>
          
          <div className="action-section">
            <button onClick={handleSave} className="save-button">저장</button>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoTrimmer;