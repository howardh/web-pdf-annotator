import React from 'react';
import {useRef, forwardRef} from 'react';
import { Link } from "react-router-dom";

import styles from './Checkbox.module.scss';

function LabelledCheckbox(props) {
  const {
    checked,
    indeterminate=false,
    onChange=console.log,
    children=null,
    ...rest
  } = props;
  return (<label className={styles['checkbox']}>
    <input type='checkbox'
      checked={checked}
      onChange={onChange}
      {...rest} />
    <i className='material-icons'>
      {
        indeterminate ? 'indeterminate_check_box' :
        checked ? 'check_box' : 'check_box_outline_blank'
      }
    </i>
    { children &&
      <span>
        {children}
      </span>
    }
  </label>);
}

export { LabelledCheckbox };
