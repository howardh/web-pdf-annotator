import React from 'react';
import {useState} from 'react';
import { useHistory } from "react-router-dom";
import axios from 'axios';

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
      console.log('Successful signup');
      setEmail('');
      setPassword1('');
      setPassword2('');
      history.push('/'); // Redirect to home page
    }).catch(error => {
      console.error(error);
      setError('Unspecified error');
    });
  }
  function handleKeyPress(e) {
    if (e.which === 13) {
      submit();
    }
  }

  return (
    <div className='signup-form-container'>
      <div className='error-message'>
        {error}
      </div>
      <label>
        Username:
        <input type='text'
            autoFocus={true}
            name='email'
            value={email}
            onKeyPress={handleKeyPress}
            onChange={e=>setEmail(e.target.value)}/>
      </label>
      <label>
        Password:
        <input type='password'
            name='password1'
            value={password1}
            onKeyPress={handleKeyPress}
            onChange={e=>setPassword1(e.target.value)}/>
      </label>
      <label>
        Confirm Password:
        <input type='password'
            name='password2'
            value={password2}
            onKeyPress={handleKeyPress}
            onChange={e=>setPassword2(e.target.value)}/>
      </label>
      <input type='submit' value='Sign Up' onClick={submit}/>
    </div>
  );
}
