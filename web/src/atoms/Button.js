import React from 'react';
import { Link } from "react-router-dom";
import PropTypes from 'prop-types';

import styles from './Button.module.scss';

function Button(props) {
  const {
    className='',
    children,
    to=null,
    ...rest
  } = props;

  if (to) {
    return (
      <Link to={to} className={styles['button']+' '+className}>
        {children}
      </Link>
    );
  } else {
    return (
      <button className={styles['button']+' '+className} {...rest}>
        {children}
      </button>
    );
  }
}

Button.propTypes = {
  className: PropTypes.string,
  to: PropTypes.string,
};

function ButtonSuccess(props) {
  const {
    className='',
    ...rest
  } = props;
  return <Button className={styles['button--success']+' '+className} {...rest}/>;
}

function ButtonError(props) {
  const {
    className='',
    ...rest
  } = props;
  return <Button className={styles['button--error']+' '+className} {...rest}/>;
}

function ButtonSmall(props) {
  const {
    className='',
    children,
    to=null,
    ...rest
  } = props;

  if (to) {
    return (
      <Link to={to} className={styles['button-small']+' '+className}>
        {children}
      </Link>
    );
  } else {
    return (
      <button className={styles['button-small']+' '+className} {...rest}>
        {children}
      </button>
    );
  }
}

function ButtonText(props) {
  const {
    className='',
    children,
    to=null,
    ...rest
  } = props;

  if (to) {
    return (
      <Link to={to} className={styles['button-text']+' '+className}>
        {children}
      </Link>
    );
  } else {
    return (
      <button className={styles['button-text']+' '+className} {...rest}>
        {children}
      </button>
    );
  }
}

function ButtonIcon(props) {
  const {
    className='',
    children,
    to=null,
    ...rest
  } = props;

  if (to) {
    return (
      <Link to={to} className={styles['button-icon']+' '+className}>
        {children}
      </Link>
    );
  } else {
    return (
      <button className={styles['button-icon']+' '+className} {...rest}>
        {children}
      </button>
    );
  }
}

export default Button;
export { Button, ButtonSuccess, ButtonError, ButtonSmall, ButtonText, ButtonIcon };
