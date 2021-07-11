import React from 'react';
import {useState} from 'react';
import { useHistory } from "react-router-dom";
import axios from 'axios';

import { TextField, Password, Button } from './Inputs.js';

import './Signup.scss';

export default function SignupPage(props) {
  return (<main className='signup-page'>
    <h1>Signup</h1>
    <SignupForm />
  </main>);
}

export function SignupForm(props) {
  const history = useHistory();
  const [email,setEmail] = useState('');
  const [password1,setPassword1] = useState('');
  const [password2,setPassword2] = useState('');
  const [error,setError] = useState('');

  function submit() {
    if (password1 !== password2) {
      setError('Passwords do not match');
      return;
    }
    let data = {
      email: email,
      password: password1
    };
    axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/users",
      data,
      {withCredentials: true}
    ).then(response => {
      window.response = response;
      console.log('Successful signup');
      setError('');
      setEmail('');
      setPassword1('');
      setPassword2('');
      history.push('/login'); // Redirect to login
    }).catch(error => {
      window.error = error;
      console.error(error);
      let message = "Unspecified error.";
      if (error.response && error.response.data) {
        message = error.response.data.error || message;
      } else {
        message = error.message || message;
      }
      setError(message);
    });
  }
  function handleKeyPress(e) {
    if (e.which === 13) {
      submit();
    }
  }

  return (
    <div className='signup-form-container'>
      <div className='oauth-links-container'>
        <a href={process.env.REACT_APP_SERVER_ADDRESS+'/auth/login/github'}>
          <img src='/oauth_icons/GitHub-Mark/PNG/GitHub-Mark-64px.png' />
        </a>
      </div>
      <div className='error-message'>
        {error}
      </div>
      <label>
        Email:
        <TextField
            autoFocus={true}
            name='email'
            value={email}
            onKeyPress={handleKeyPress}
            onChange={e=>setEmail(e.target.value)}/>
      </label>
      <label>
        Password:
        <Password
            name='password1'
            value={password1}
            onKeyPress={handleKeyPress}
            onChange={e=>setPassword1(e.target.value)}/>
      </label>
      <label>
        Confirm Password:
        <Password
            name='password2'
            value={password2}
            onKeyPress={handleKeyPress}
            onChange={e=>setPassword2(e.target.value)}/>
      </label>
      <Button onClick={submit}>
        Sign Up
      </Button>
    </div>
  );
}
