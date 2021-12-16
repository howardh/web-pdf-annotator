import React from 'react';
import { Link } from "react-router-dom";

import styles from './Navigation.module.scss';

function Navigation(props) {
  const {
    userId,
    confirmed
  } = props;
  if (userId) {
    return (<nav>
      <Link to='/docs'>Documents</Link>
      <Link to='/notes'>Notes</Link>
      <Link to='/logout'>Logout</Link>
      <span>
        Currently logged in as 
        <Link to='/account'>{userId}</Link>
      </span>
    </nav>);
  } else {
    return (<nav>
      <Link to='/signup'>Signup</Link>
      <Link to='/login'>Login</Link>
      <span>
        Not logged in
      </span>
    </nav>);
  }
}

export { Navigation };
