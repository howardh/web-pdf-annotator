import React from 'react';

import styles from './GroupedInput.module.scss';

function GroupedInputs(props) {
  const {
    children=null,
    className='',
  } = props;

  return (
    <div className={[styles['grouped-inputs'],className].join(' ')}>
      {children}
    </div>
  );
}

export { GroupedInputs };
