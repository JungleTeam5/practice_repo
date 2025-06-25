// /src/types.ts

// 미디어 라이브러리에서 관리하는 파일의 타입
export interface MediaFile {
  id: string;
  file: File;
  name: string;
}

// 타임라인에 배치된 클립의 타입
export interface TimelineClip {
  id: string;
  media: MediaFile;
  duration: number; 
}

export interface SourceVideo {
  file: File;
  url: string;
  duration: number;
}

export interface EQBand {
  id: string;
  frequency: number; // 헤르츠 (Hz)
  gain: number;      // 데시벨 (dB)
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | 'original';

export interface TrimmerState {
  id: string;
  sourceVideo: SourceVideo | null;
  startTime: number;
  endTime: number;
  equalizer: EQBand[];
  volume: number;
  // ✨ 화면 비율 상태 추가
  aspectRatio: AspectRatio;
}