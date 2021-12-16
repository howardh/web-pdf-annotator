import React from 'react';
import {useRef, forwardRef} from 'react';
import { Link } from "react-router-dom";

import { generateClassNames } from '../Utils.js';
import styles from './Input.module.scss';

function Input(props, ref) {
  const {
    className='',
    error=false,
    ...rest
  } = props;
  let cn = generateClassNames({
    [styles['input']]: true,
    [styles['input--error']]: error,
    [className]: true,
  });
  return (
    <input className={cn}
      {...rest}
      ref={ref} />
  );
}
Input = forwardRef(Input);

function LabelledInput(props) {
  const {
    label='',
    className='',
    error=false,
    value,
    ...rest
  } = props;
  let labelClassName = generateClassNames({
    [styles['labelled-input']]: true,
    [styles['labelled-input--error']]: error,
    [className]: true,
  });
  let inputClassName = generateClassNames({
    [styles['labelled-input__input']]: true,
    [styles['labelled-input__input--filled']]: value
  });
  return (
    <label className={labelClassName}>
      <input className={inputClassName} value={value} {...rest} />
      <span className={styles['labelled-input__label']}>{label}</span>
    </label>
  );
}

function IconInput(props) {
  const {
    icon='',
    className='',
    ...rest
  } = props;
  return (
    <label className={styles['labelled-input']}>
      <i className='material-icons'>{icon}</i>
      <input className={styles['labelled-input__input']} {...rest} />
      <span></span>
    </label>
  );
}

function DropdownInput(props) {
  const {
    label='',
    className='',
    error=false,
    value,
    dropdown=()=>null,
    ...rest
  } = props;
  let labelClassName = generateClassNames({
    [styles['labelled-input']]: true,
    [styles['labelled-input--error']]: error,
    [className]: true,
  });
  let inputClassName = generateClassNames({
    [styles['labelled-input__input']]: true,
    [styles['labelled-input__input--filled']]: value
  });
  return (
    <label className={labelClassName}>
      <input className={inputClassName} value={value} {...rest} />
      <span className={styles['labelled-input__label']}>{label}</span>
      <div className={styles['labelled-input__dropdown']}>
        {dropdown(value)}
      </div>
    </label>
  );
}

function TextArea(props) {
  const {
    className='',
    error=false,
    ...rest
  } = props;
  let cn = generateClassNames({
    [styles['textarea']]: true,
    [styles['input']]: true,
    [styles['input--error']]: error,
    [className]: true,
  });
  return (
    <textarea className={cn}
      {...rest} />
  );
}

function LabelledTextArea(props) {
  const {
    label='',
    className='',
    error=false,
    ...rest
  } = props;
  let labelClassName = generateClassNames({
    [styles['labelled-input']]: true,
    [styles['labelled-input--error']]: error,
    [className]: true,
  });
  let inputClassName = generateClassNames({
    [styles['textarea']]: true,
    [styles['input']]: true,
  });
  return (
    <label className={labelClassName}>
      <span className={styles['textarea__label']}>{label}</span>
      <textarea className={inputClassName}
        {...rest} />
    </label>
  );
}

export {
  Input,
  LabelledInput,
  DropdownInput,
  TextArea,
  LabelledTextArea
};
