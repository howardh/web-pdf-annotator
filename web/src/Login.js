import React from 'react';
import {useState,useEffect} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { useHistory } from "react-router-dom";

import { TextField,Password,Button } from './Inputs.js';

import {login,logout} from './actions/index.js';

import './Login.scss';

export default function LoginPage(props) {
  const history = useHistory();
  const dispatch = useDispatch();
  const error = useSelector(state => state.session.error);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');

  function submit() {
    dispatch(login(email,password,true)).then(success => {
      if (success) {
        history.push('/docs');
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
      Via a third party app
      <div className='oauth-links-container'>
        <a href={process.env.REACT_APP_SERVER_ADDRESS+'/auth/login/github'}>
          <img src='http://localhost:3000/oauth_icons/GitHub-Mark/PNG/GitHub-Mark-64px.png' />
        </a>
      </div>
      Or by email
      <div className='error-message'>{error}</div>
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
            name='password'
            value={password}
            onKeyPress={handleKeyPress}
            onChange={e=>setPassword(e.target.value)}/>
      </label>
      <Button onClick={submit}>Login</Button>
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
  },[dispatch]);

  return (<main className='logout-page'>
    <h1>Logging Out...</h1>
  </main>);
}
