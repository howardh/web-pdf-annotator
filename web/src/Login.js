import React from 'react';
import {useState} from 'react';
import axios from 'axios';

export default function LoginPage(props) {
  const [email,setEmail] = useState('foo@email.com');
  const [password,setPassword] = useState('asdf');

  function submit() {
    let url = 'http://localhost:5000/api/auth/login';
    let data = {
      email: email,
      password: password
    };
    axios.post(
      url, data, {withCredentials: true}
    ).then(response => {
      console.log('RESPONSE RECEIVED');
      // TODO: Redirect to login page
    }).catch(error => {
      console.log('ERROR RECEIVED')
      // TODO: Display error message
    });
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
