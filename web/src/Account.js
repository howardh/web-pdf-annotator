import axios from 'axios';
import React from 'react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { LabelledInput } from 'atoms/Input.js';
import { Button } from 'atoms/Button.js';

import {updateSession} from './actions/index.js';

import {
  Password
} from './Inputs.js';
import {
  formChangeHandler
} from './Utils.js'

import './Account.scss';

export default function AccountPage(props) {
  function deleteAccount() {
  }

  return (<main className='account-page'>
    <h1>Account</h1>
    <LinkAccountForm />
    <PasswordChangeForm />
    <div>
      <h2>Delete Account</h2>
      <Button>Delete</Button>
    </div>
  </main>);
}

function LinkAccountForm(props) {
  const dispatch = useDispatch();
  const githubId = useSelector(state => state.session.githubId);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [password, setPassword] = useState('');

  function unlink(name, password) {
    console.log(password);
    axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/users/unlink/"+name,
      {password},
      {withCredentials: true}
    ).then(response => {
      setMessage(response.data.message);
      setError('');
      setPassword('');
      dispatch(updateSession());
    }).catch(error => {
      console.error(error);
      let message = "Unspecified error.";
      if (error.response && error.response.data) {
        message = error.response.data.error || message;
      } else {
        message = error.message || message;
      }
      setError(message);
      setMessage('');
    });
  }

  return (
    <div className='link-account-form'>
      <h2>Link Account</h2>
      <div className='error-message'>{error}</div>
      <div className='success-message'>{message}</div>
      <ul>
        <li>
          <span>Github:</span>
          {
            githubId 
              ? <Button onClick={()=>unlink('github',password)}>Unlink</Button>
              : <a href={process.env.REACT_APP_SERVER_ADDRESS+'/auth/login/github/link'}><Button>Link</Button></a>
          }
        </li>
      </ul>
      <LabelledInput
          type='password'
          label='Current Password'
          name='password'
          value={password}
          onChange={e=>setPassword(e.target.value)}/>
    </div>
  );
}

function PasswordChangeForm(props) {
  const [error,setError] = useState('');
  const [formState,setFormState] = useState({
    password: '',
    password1: '',
    password2: '',
  });
  function submitChange() {
    if (formState['password1'] !== formState['password2']) {
      setError('Passwords do not match');
      return;
    }
    let data = {
      password: formState['password'],
      new_password: formState['password1']
    };
    axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/users/change_password",
      data,
      {withCredentials: true}
    ).then(response => {
      console.log(response.message);
      setError('');
      setFormState({
        password: '',
        password1: '',
        password2: '',
      });
    }).catch(error => {
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
    if (e.key === 'Enter') {
      submitChange();
    }
  }
  const handleChange = formChangeHandler(formState,setFormState);

  return (
    <div className='password-change-form'>
      <h2>Change Password</h2>
      <LabelledInput
          type='password'
          name='password'
          label='Current Password'
          value={formState['password']}
          onKeyPress={handleKeyPress}
          onChange={handleChange}/>
      <LabelledInput
          type='password'
          name='password1'
          label='New Password'
          value={formState['password1']}
          onKeyPress={handleKeyPress}
          onChange={handleChange}/>
      <LabelledInput
          type='password'
          name='password2'
          label='Confirm New Password'
          value={formState['password2']}
          onKeyPress={handleKeyPress}
          onChange={handleChange}/>
      <Button onClick={submitChange}>Save Changes</Button>
    </div>
  );
}
