import React from 'react';

import styles from './Tag.module.scss';

function Tag(props, ref) {
  const {
    className='',
    children=null,
    removable=false,
    ...rest
  } = props;
  //return (<div className={'tag '+className}>
  return (<div className={styles['tag']+' '+className} {...rest} >
    {children}
    {
      removable &&
      <button className={styles['tag-button__remove']}>
        <div />
        <div />
        <div />
        <div />
      </button>
    }
  </div>);
}

function TagSmall(props) {
  const {
    className='',
    ...rest
  } = props;
  return <Tag 
    className={styles['tag-small']+' '+className}
    {...rest} />;
}

export {Tag, TagSmall};
