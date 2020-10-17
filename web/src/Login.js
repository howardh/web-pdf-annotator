import React from 'react';
import {useState,useEffect} from 'react';
import {useDispatch} from 'react-redux';
import {login} from './actions/index.js';

export default function LoginPage(props) {
  const dispatch = useDispatch();
  const [email,setEmail] = useState('foo@email.com');
  const [password,setPassword] = useState('asdf');

  function submit() {
    let url = 'http://localhost:5000/api/auth/login';
    let data = {
      email: email,
      password: password
    };
    dispatch(login(email,password,true));
  }

  return (<div>
    Login Page
    <div>
      <label>
        Username:
        <input type='text'
            name='email'
            value={email}
            onChange={e=>setEmail(e.target.value)}/>
      </label>
      <label>
        Password:
        <input type='password'
            name='password'
            value={password}
            onChange={e=>setPassword(e.target.value)}/>
      </label>
      <input type='submit' value='Login' onClick={submit}/>
    </div>
  </div>);
}
