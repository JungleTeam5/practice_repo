// src/App.tsx
import React from 'react';
import VideoUploader from './VideoUploader';
import VideoTrimmer from './VideoTrimmer';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <VideoUploader />
        <VideoTrimmer />
      </header>
    </div>
  );
}

export default App;