// src/App.tsx
import React from 'react';
import VideoUploader from './components/VideoUploader';
import VideoTrimmer from './components/VideoTrimmer';
import './App.css';
import EditorPage from './EditorPage';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <EditorPage/>
      </header>
    </div>
  );
}

export default App;