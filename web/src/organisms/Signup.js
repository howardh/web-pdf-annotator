import React from 'react';
import {useState} from 'react';

import { ErrorMessage } from '../atoms/Message.js';
import { LabelledInput } from '../atoms/Input.js';
import { Button, ButtonText } from '../atoms/Button.js';
import { LabelledCheckbox } from '../atoms/Checkbox.js';

import styles from './Signup.module.scss';

function SignupForm(props) {
  const {
    onSignupByEmail = ()=>null,
    error = {},
  } = props;

  const [value, setValue] = useState({
    email: '',
    password1: '',
    password2: '',
  });
  const OAUTH = 0;
  const EMAIL = 1;
  const [form,setForm] = useState(OAUTH);

  function handleSignupByEmail() {
    onSignupByEmail(value);
  }

  return (<div className={styles['signup-form']}>
    {
      form === OAUTH ? (<>
        <div className={styles['signup-form__form']}>
          <SignupFormOauth />
        </div>
        <div className={styles['signup-form__button']}>
          <ButtonText onClick={()=>setForm(EMAIL)}>Signup via email</ButtonText>
        </div>
      </>) : (<>
        <div className={styles['signup-form__form']}>
          <SignupFormEmail value={value} onChange={setValue} onSignup={handleSignupByEmail} error={error} />
        </div>
        <div className={styles['signup-form__button']}>
          <ButtonText onClick={()=>setForm(OAUTH)}>Signup via oauth</ButtonText>
        </div>
      </>)
    }
  </div>);
}

function SignupFormEmail(props) {
  const {
    value={},
    error={},
    onChange=console.log,
    onSignup=()=>null,
  } = props;
  const {
    email,
    password1,
    password2,
  } = value;
  function handleChange(e) {
    let newVal = {
      ...value
    };
    if (e.target.type === 'checkbox') {
      newVal[e.target.name] = e.target.checked;
    } else {
      newVal[e.target.name] = e.target.value;
    }
    onChange(newVal);
  }
  return (<div className={styles['signup-form-email']}>
    {
      Object.values(error).map(e => <ErrorMessage>{e}</ErrorMessage>)
    }
    <LabelledInput
        label='email'
        name='email'
        value={email}
        error={error['email']}
        onChange={handleChange} />
    <LabelledInput
        type='password'
        name='password1'
        label='password'
        value={password1}
        error={error['password1']}
        onChange={handleChange} />
    <LabelledInput
        type='password'
        name='password2'
        label='confirm password'
        value={password2}
        error={error['password2']}
        onChange={handleChange} />
    <Button onClick={onSignup}>Signup</Button>
  </div>);
}

function SignupFormOauth(props){
  return (
    <div className={styles['signup-form-oauth']}>
      <a href={process.env.REACT_APP_SERVER_ADDRESS+'/auth/login/github'}>
        <img src='/oauth_icons/GitHub-Mark/PNG/GitHub-Mark-64px.png' />
      </a>
    </div>
  );
}

export { SignupForm, SignupFormEmail, SignupFormOauth };
