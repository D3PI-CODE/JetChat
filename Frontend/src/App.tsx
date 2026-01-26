import './App.css';
import React from 'react';
import AppRouter from './router/router.tsx';

function App() {

  return (
    <div className="App flex justify-center items-center min-h-screen bg-gradient-to-br from-[#0a0e0e] via-[#0f1414] to-[#0a0e0e] font-['Inter','system-ui','-apple-system','sans-serif'] text-white relative overflow-hidden">
      {/* Background blur elements for depth - same as chat page */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.015),transparent_70%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.01),transparent_70%)] pointer-events-none"></div>
      <AppRouter />
    </div>
  );
}

export default App;
