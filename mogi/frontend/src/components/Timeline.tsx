import React from 'react';
import { TimelineClip } from '../types'; // 'types'에서 가져옴

interface TimelineProps {
  clips: TimelineClip[];
  globalTime: number;
}

const Timeline: React.FC<TimelineProps> = ({ clips, globalTime }) => {
    // ... 컴포넌트 내용은 이전과 동일 ...
    const PIXELS_PER_SECOND = 20;

    return (
      <div className="timeline panel">
        <h3>타임라인</h3>
        <div className="timeline-tracks">
          <div 
            className="playhead"
            style={{ left: `${globalTime * PIXELS_PER_SECOND}px` }}
          ></div>
  
          {clips.map((clip) => (
            <div 
              key={clip.id}
              className="timeline-clip"
              style={{ width: `${clip.duration * PIXELS_PER_SECOND}px` }}
              // onClick={() => onClipSelect(clip)} // 재생 중 클릭은 복잡성을 야기하므로 일단 비활성화
            >
              {clip.media.name}
            </div>
          ))}
        </div>
      </div>
    );
}

export default Timeline;