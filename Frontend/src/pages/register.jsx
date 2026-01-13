/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import './register.css';
import axios from 'axios';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Register() {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [data, setData] = useState(null);
  const [passwordValid, setPasswordValid] = useState(true);
  const [emailValid, setEmailValid] = useState(true);
  const [usernameValid, setUsernameValid] = useState(true);

  const navigate = useNavigate();

  const passwordValidation = (event) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(event.target.value)) {
      setPassword(event.target.value);
      setPasswordValid(false);
      } else {
        setPassword(event.target.value);
        setPasswordValid(true);
      }
  };

  const emailValidation = (event) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(event.target.value)) {
          setEmailValid(false);
          setEmail(event.target.value);
      } else {
        setEmailValid(true);
        setEmail(event.target.value);
      }
  };

  const usernameValidation = (event) => {
    setUsername(event.target.value);
  }

  const handleSubmit = async (event) => {
      if (!passwordValid || !emailValid || !usernameValid) return;
      event.preventDefault();

      try {
          const response = await axios.post('/api/auth/register', {
            username: username,
            email: email,
            password: password,
          });

          if (response.status !== 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          console.log(response.data.message);
          if (response.data.message === "Registration successful") {
            navigate("/login");
          } else {
            alert('Registration failed. Please try again.');
          }
      } catch (error) {
          console.error('Error:', error);
          alert('An error occurred during registration. Please try again.');
      }
  };

  return (
    <div className="relative z-10 w-full max-w-md">
      {/* Apple-esque ultra-subtle glass card */}
      <div className="bg-black/8 backdrop-blur-2xl rounded-3xl p-8 md:p-10 shadow-xl border border-white/8 relative overflow-hidden">
        {/* Extremely subtle inner highlight - barely visible */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/3 to-transparent rounded-3xl"></div>

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-sm">
              Create Account
            </h1>
            <p className="mt-3 text-sm text-white/70">
              D3PI's Realtime Chat App
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-col space-y-2">
              <label
                className="text-sm font-medium text-white/90"
                htmlFor="username"
              >
                Username
              </label>
              <input
                className="w-full rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 text-white placeholder-white/50 px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 focus:bg-white/12 hover:bg-white/10"
                id="user-name"
                name="user-name"
                placeholder="JaneDoe321"
                onChange={(e) => usernameValidation(e)}
                type="text"
                value={username}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label
                className="text-sm font-medium text-white/90"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className="w-full rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 text-white placeholder-white/50 px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 focus:bg-white/12 hover:bg-white/10"
                id="email"
                name="email"
                placeholder="jane.doe@example.com"
                onChange={(e) => emailValidation(e)}
                type="email"
                value={email}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label
                className="text-sm font-medium text-white/90"
                htmlFor="password"
              >
                Password
              </label>
              <input
                className="w-full rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 text-white placeholder-white/50 px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 focus:bg-white/12 hover:bg-white/10"
                id="password"
                name="password"
                placeholder="8+ characters"
                onChange={(e) => passwordValidation(e)}
                type="password"
                value={password}
              />
              <p className={`text-xs transition-colors duration-300 ${
                passwordValid ? 'text-white/60' : 'text-red-400'
              }`}>
                Must include at least 8 characters, one uppercase letter, and one number.
              </p>
            </div>

            <button
              className="w-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl py-3 px-4 text-base font-medium shadow-lg hover:shadow-xl hover:shadow-blue-500/25 hover:scale-[1.02] transition-all duration-600 ease-out border border-white/10 group relative overflow-hidden"
              type="submit"
            >
              <span className="relative z-10">Create Account</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-white/70">
              Already have an account?{' '}
              <NavLink
                className="font-medium text-blue-400 hover:text-blue-300 transition-colors duration-300 hover:underline"
                to="/login"
              >
                Sign in
              </NavLink>
            </p>
          </div>
        </div>
      </div>


    </div>
  );
}
