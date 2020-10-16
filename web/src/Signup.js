import React from 'react';
import {useState} from 'react';
import axios from 'axios';

export default function SignupPage(props) {
  const [email,setEmail] = useState('foo@email.com');
  const [password1,setPassword1] = useState('asdf');
  const [password2,setPassword2] = useState('asdf');

  function submit() {
    if (password1 !== password2) {
      window.alert('Passwords do not match');
      return;
    }
    let url = 'http://localhost:5000/api/data/users';
    let data = {
      email: email,
      password: password1
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
    Signup Page
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
            name='password1'
            value={password1}
            onChange={e=>setPassword1(e.target.value)}/>
      </label>
      <label>
        Confirm Password:
        <input type='password'
            name='password2'
            value={password2}
            onChange={e=>setPassword2(e.target.value)}/>
      </label>
      <input type='submit' value='Submit' onClick={submit}/>
    </div>
  </div>);
}

