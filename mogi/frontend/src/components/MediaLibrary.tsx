import React from 'react';
import { MediaFile } from '../types'; // 'VideoEditor' 대신 'types'에서 가져옴

interface MediaLibraryProps {
  mediaFiles: MediaFile[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddClip: (mediaFile: MediaFile) => void;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ mediaFiles, onFileUpload, onAddClip }) => {
  // ... 컴포넌트 내용은 이전과 동일 ...
  return (
    <div className="media-library panel">
      <h3>미디어 라이브러리</h3>
      <div className="upload-section">
        <label htmlFor="file-upload" className="custom-file-upload">
          영상 파일 업로드
        </label>
        <input id="file-upload" type="file" multiple onChange={onFileUpload} accept="video/*" />
      </div>
      <ul className="media-list">
        {mediaFiles.map(media => (
          <li key={media.id} className="media-item">
            <span>{media.name}</span>
            <button onClick={() => onAddClip(media)}>타임라인에 추가</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MediaLibrary;