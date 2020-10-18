import React from 'react';
import {useState,useEffect} from 'react';
import {useDispatch} from 'react-redux';
import { useHistory } from "react-router-dom";

import {login,logout} from './actions/index.js';

import './Login.scss';

export default function LoginPage(props) {
  const history = useHistory();
  const dispatch = useDispatch();
  const [error,setError] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');

  function submit() {
    let url = 'http://localhost:5000/api/auth/login';
    let data = {
      email: email,
      password: password
    };
    dispatch(login(email,password,true)).then(response=>{
      window.response = response;
      console.log(response);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        history.push('/docs');
      }
    }).catch(error => {
      window.error = error;
      if (error.data.error) {
        setError(error.data.error);
      }
    });
  }
  function handleKeyPress(e) {
    if (e.which === 13) {
      submit();
    }
  }

  return (<main className='login-page'>
    <h1>Login</h1>
    <div className='login-form-container'>
      <div className='error-message'>{error}</div>
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
            name='password'
            value={password}
            onKeyPress={handleKeyPress}
            onChange={e=>setPassword(e.target.value)}/>
      </label>
      <input type='submit' value='Login' onClick={submit}/>
    </div>
  </main>);
}

export function LogoutPage(props) {
  const history = useHistory();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(logout()).then(() => {
      history.push('/');
    });
  },[]);

  return (<main className='logout-page'>
    <h1>Logging Out...</h1>
  </main>);
}
