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

  const handleSubmit = (event) => {
      if (!passwordValid || !emailValid || !usernameValid) return;
      event.preventDefault(); // Prevent default form submission
      axios.post('/api/auth/register', {
        username: username,
        email: email,
        password: password,
      })
      .then((response) => {
        if (!response.status === 200) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log(response.data.message);
        if (response.data.message == "Registration successful") {
          return navigate("/login");
        }
      })
  };

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl bg-[#D9D9D9] p-8 md:p-12 shadow-2xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-text-light">
          Create an Account
        </h1>
        <p className="mt-2 text-sm text-text-subtle">
          Dep's Realtime Chat App
        </p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-normal text-text-light pb-2"
            htmlFor="username"
          >
            Username
          </label>
          <input
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-transparent bg-[#111818]/20 text-text-light focus:outline-0 focus:ring-0 h-12 placeholder:text-text-subtle p-3 text-base font-normal leading-normal transition-shadow duration-200"
            id="user-name"
            name="user-name"
            placeholder="e.g., JaneDoe321"
            onChange={(e) => usernameValidation(e)}
            type="text"
            value={username}
          />
        </div>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-normal text-text-light pb-2"
            htmlFor="email"
          >
            Email
          </label>
          <input
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-transparent bg-[#111818]/20 text-text-light focus:outline-0 focus:ring-0 h-12 placeholder:text-text-subtle p-3 text-base font-normal leading-normal transition-shadow duration-200"
            id="email"
            name="email"
            placeholder="e.g., jane.doe@example.com"
            onChange={(e) => emailValidation(e)}
            type="email"
            value={email}
          />
          <p className="mt-2 text-sm text-error hidden">
            Please enter a valid email address.
          </p>
        </div>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-normal text-text-light pb-2"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative flex w-full flex-1 items-stretch">
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-transparent bg-[#111818]/20 text-text-light focus:outline-0 focus:ring-0 h-12 placeholder:text-text-subtle p-3 pr-10 text-base font-normal leading-normal transition-shadow duration-200"
              id="password"
              name="password"
              placeholder="8+ characters"
              onChange={(e) => passwordValidation(e)}
              type="password"
              value={password}
            />
          </div>
          <p className="mt-2 text-xs text-text-subtle"
          style={{ color : passwordValid ? 'inherit' : 'red' }}>
            Must include at least 8 characters, one uppercase letter, and one
            number.
          </p>
        </div>
        <button className="Register flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary bg-[#111818]/20 text-base font-bold" type="submit bg-"> Register </button>
      </form>
      <div className="text-center">
        <p className="text-sm text-text-subtle">
          Already have an account? <NavLink className="font-semibold text-primary hover:underline" to="/login"> Log in</NavLink>
        </p>
      </div>
    </div>
  );
}