import './App.css';
import React from 'react';
import Login from './login.jsx';
import Register from './register.jsx';
import AuthAppRouter from './router.jsx';
function App() {

  return (
    <div className="App flex justify-center items-center min-h-screen">
      <AuthAppRouter />
    </div>
  );
}

export default App;
