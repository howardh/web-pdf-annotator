import React from 'react';

import styles from './Message.module.scss';

function ErrorMessage(props) {
  const {
    className='',
    children,
  } = props;

  let cn = [
    styles['message'],
    styles['message--error'],
    className
  ].join(' ');
  return (<div className={cn}>
    {children}
  </div>);
}

function SuccessMessage(props) {
  const {
    className='',
    children,
  } = props;

  let cn = [
    styles['message'],
    styles['message--success'],
    className
  ].join(' ');
  return (<div className={cn}>
    {children}
  </div>);
}

export { ErrorMessage, SuccessMessage };
