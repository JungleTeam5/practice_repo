// /src/VideoEditor.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Preview from './Preview';
import Timeline from './Timeline';
import MediaLibrary from './MediaLibrary';
import { MediaFile, TimelineClip } from '../types';

interface ActiveClipInfo {
  clip: TimelineClip | null;
  localTime: number;
}

const VideoEditor: React.FC = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [globalTime, setGlobalTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeClipInfo, setActiveClipInfo] = useState<ActiveClipInfo>({ clip: null, localTime: 0 });

  // --- 수정된 부분: useRef에 명시적인 초기값(undefined)을 전달합니다. ---
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateTimeRef = useRef<number | undefined>(undefined);
  // ----------------------------------------------------------------

  const handlePause = useCallback(() => {
    if (!isPlaying) return;
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isPlaying]);

  const mainLoop = useCallback((time: number) => {
    if (lastUpdateTimeRef.current) {
      const deltaTime = (time - lastUpdateTimeRef.current) / 1000;
      setGlobalTime(prevTime => prevTime + deltaTime);
    }
    lastUpdateTimeRef.current = time;
    animationFrameRef.current = requestAnimationFrame(mainLoop);
  }, []);

  const handlePlay = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    lastUpdateTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(mainLoop);
  }, [isPlaying, mainLoop]);


  useEffect(() => {
    let cumulativeTime = 0;
    let foundClip: TimelineClip | null = null;
    let localTime = 0;

    for (const clip of timelineClips) {
      const clipStartTime = cumulativeTime;
      const clipEndTime = cumulativeTime + clip.duration;

      if (globalTime >= clipStartTime && globalTime < clipEndTime) {
        foundClip = clip;
        localTime = globalTime - clipStartTime;
        break;
      }
      cumulativeTime = clipEndTime;
    }

    if (globalTime >= cumulativeTime && timelineClips.length > 0) {
        handlePause();
        setGlobalTime(cumulativeTime);
    }

    setActiveClipInfo({ clip: foundClip, localTime });

  }, [globalTime, timelineClips, handlePause]);


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    const newMediaFiles: MediaFile[] = files.map(file => ({
      id: URL.createObjectURL(file),
      file: file,
      name: file.name,
    }));
    setMediaFiles(prevFiles => [...prevFiles, ...newMediaFiles]);
  };

  const addClipToTimeline = (mediaFile: MediaFile) => {
    const newClip: TimelineClip = {
      id: `clip-${Date.now()}`,
      media: mediaFile,
      duration: 10,
    };
    setTimelineClips(prevClips => [...prevClips, newClip]);
  };

  const handleExport = async () => { /* ... 내보내기 로직 ... */ };

  return (
    <div className="video-editor-layout">
      <div className="top-panel">
        <MediaLibrary 
          mediaFiles={mediaFiles} 
          onFileUpload={handleFileUpload} 
          onAddClip={addClipToTimeline}
        />
        <Preview activeClipInfo={activeClipInfo} />
      </div>
      <div className="bottom-panel">
        <Timeline clips={timelineClips} globalTime={globalTime} />
      </div>
      <div className="controls-container">
        <button onClick={isPlaying ? handlePause : handlePlay}>
          {isPlaying ? '일시정지' : '재생'}
        </button>
        <span>타임라인 시간: {globalTime.toFixed(2)}s</span>
      </div>
      <div className="export-container">
        <button onClick={handleExport} className="export-button">
          내보내기 (Export)
        </button>
      </div>
    </div>
  );
}

export default VideoEditor;