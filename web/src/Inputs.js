import React from 'react';
import {useRef, forwardRef} from 'react';
import { Link } from "react-router-dom";

import './Inputs.scss';

const inputClassName = 'input'

function TextField(props, ref) {
  return (<div className={inputClassName}>
    <input type='textfield' {...props} ref={ref} />
  </div>);
}
TextField = forwardRef(TextField);

function Password(props) {
  return (<div className={inputClassName}>
    <input type='password' {...props} />
  </div>);
}

function Button(props) {
  const {
    children,
    to=null,
    ...rest
  } = props;

  if (to) {
    return (<div className={inputClassName}>
      <Link to={to}>
        <button {...rest}>
          {children}
        </button>
      </Link>
    </div>);
  } else {
    return (<div className={inputClassName}>
      <button {...rest}>
        {children}
      </button>
    </div>);
  }
}

function Checkbox(props) {
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
  return (<div className={inputClassName+' checkbox'} tabIndex={-1} onKeyDown={handleKeyDown} onClick={toggle}>
    <i className='material-icons'>
      {checked ? 'check_box' : 'check_box_outline_blank'}
    </i>
    <input type='checkbox' ref={ref} checked={checked}
        onChange={onChange} {...rest} />
  </div>);
}

function GroupedInputs(props) {
  return (<div className='grouped-inputs'>
    {props.children}
  </div>);
}

function Tooltip(props) {
  const {
    children
  } = props;
  return (
    <div className='tooltip'>
      {children}
      <div className='tooltip-arrow'></div>
    </div>
  );
}

export {TextField, Password, Button, Checkbox, GroupedInputs, Tooltip};
