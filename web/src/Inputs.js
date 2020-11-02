import React from 'react';
import {useRef} from 'react';

import './Inputs.scss';

const inputClassName = 'input'

export function TextField(props) {
  return (<div className={inputClassName}>
    <input type='textfield' {...props} />
  </div>);
}

export function Password(props) {
  return (<div className={inputClassName}>
    <input type='password' {...props} />
  </div>);
}

export function Button(props) {
  const {
    children,
    ...rest
  } = props;
  return (<div className={inputClassName}>
    <button {...rest}>
      {children}
    </button>
  </div>);
}

export function Checkbox(props) {
  const {
    checked,
    onChange=console.log,
    ...rest
  } = props;
  const ref = useRef(null);
  function toggle(e) {
    if (e.target.closest('label')) {
      return; // Don't do anyting if it's contained in a label
    }
    let event = new Event('input', {bubbles: true});
    ref.current.checked = !checked;
    ref.current.dispatchEvent(event);
    onChange(event);
  }
  function handleKeyDown(event) {
    if (event.key === ' ') {
      toggle();
    }
  }
  return (<div className={inputClassName} tabIndex={-1} onKeyDown={handleKeyDown} onClick={toggle}>
    <i className='material-icons'>
      {checked ? 'check_box' : 'check_box_outline_blank'}
    </i>
    <input type='checkbox' ref={ref} checked={checked}
        onChange={onChange} {...rest} />
  </div>);
}
