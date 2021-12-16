import React from 'react';

import styles from './Tooltip.module.scss';

function Tooltip(props, ref) {
  const {
    children
  } = props;
  return (
    <div className={styles['tooltip']}>
      {children}
      <div className={styles['tooltip__arrow']}></div>
    </div>
  );
}

export {Tooltip};
