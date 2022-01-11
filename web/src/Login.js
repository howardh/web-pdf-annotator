import React from 'react';
import {useState,useEffect} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { useHistory } from "react-router-dom";

import { TextField,Password,Button } from './Inputs.js';
import { LoginForm } from './organisms/Login.js';

import {login,logout} from './actions/index.js';

import './Login.scss';

export default function LoginPage(props) {
  const history = useHistory();
  const dispatch = useDispatch();
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState({});

  function handleLogin({email, password, remember}) {
    dispatch(login(email,password,true)).then(response => {
      if ('error' in response) {
        setError({general: response.error});
      } else {
        history.push('/docs');
      }
    });
  }

  return (<main className='login-page'>
    <h1>Login</h1>
    <div className='login-form-container'>
      <LoginForm onLoginByEmail={handleLogin} error={error} />
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
