import React from 'react';
import {useState} from 'react';
import { useHistory } from "react-router-dom";
import axios from 'axios';

import { LabelledInput } from 'atoms/Input.js';
import { Button } from 'atoms/Button.js';
import { SignupForm as SignupFormOrganism } from 'organisms/Signup.js';

import './Signup.scss';

export default function SignupPage(props) {
  return (<main className='signup-page'>
    <h1>Signup</h1>
    <SignupForm />
  </main>);
}

export function SignupForm(props) {
  const history = useHistory();
  const [error,setError] = useState({});

  function handleSignupByEmail(value) {
    const {
      email,
      password1,
      password2,
    } = value;
    if (password1 !== password2) {
      setError({
        'password1': 'Passwords do not match',
        'password2': 'Passwords do not match',
      });
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
      setError({});
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
      setError({
        general: message
      });
    });
  }

  return <SignupFormOrganism onSignupByEmail={handleSignupByEmail} error={error}/>;
}
