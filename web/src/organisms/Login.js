import React from 'react';
import {useState} from 'react';

import { ErrorMessage } from '../atoms/Message.js';
import { LabelledInput } from '../atoms/Input.js';
import { Button, ButtonText } from '../atoms/Button.js';
import { LabelledCheckbox } from '../atoms/Checkbox.js';

import styles from './Login.module.scss';

function LoginForm(props) {
  const { } = props;
  const [value, setValue] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const OAUTH = 0;
  const EMAIL = 1;
  const [form,setForm] = useState(OAUTH);
  return (<div className={styles['login-form']}>
    {
      form === OAUTH ? (<>
        <div className={styles['login-form__form']}>
          <LoginFormOauth />
        </div>
        <div className={styles['login-form__button']}>
          <ButtonText onClick={()=>setForm(EMAIL)}>Login via email</ButtonText>
        </div>
      </>) : (<>
        <div className={styles['login-form__form']}>
          <LoginFormEmail value={value} onChange={setValue} />
        </div>
        <div className={styles['login-form__button']}>
          <ButtonText onClick={()=>setForm(OAUTH)}>Login via oauth</ButtonText>
        </div>
      </>)
    }
  </div>);
}

function LoginFormEmail(props) {
  const {
    value={},
    error={},
    onChange=console.log,
  } = props;
  const {
    email,
    password,
    remember
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
  return (<div className={styles['login-form-email']}>
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
        name='password'
        label='password'
        value={password}
        error={error['password']}
        onChange={handleChange} />
    <LabelledCheckbox
        name='remember'
        checked={remember}
        onChange={handleChange} >
      Remember me
    </LabelledCheckbox>
    <Button>Login</Button>
  </div>);
}

function LoginFormOauth(props){
  return (
    <div className={styles['login-form-oauth']}>
      <a href={process.env.REACT_APP_SERVER_ADDRESS+'/auth/login/github'}>
        <img src='/oauth_icons/GitHub-Mark/PNG/GitHub-Mark-64px.png' />
      </a>
    </div>
  );
}

export { LoginForm, LoginFormEmail, LoginFormOauth };
