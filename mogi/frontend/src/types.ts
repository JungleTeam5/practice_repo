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