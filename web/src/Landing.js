import React from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link } from "react-router-dom";

import './Landing.scss';

export default function LandingPage(props) {
  const userId = useSelector(state => state.session.uid);

  if (userId) {
    return (<div className='landing-page'>
      <h1>Landing page</h1>
      <div>
        <Link to='/docs'>Documents</Link>
        <Link to='/logout'>Logout</Link>
      </div>
    </div>);
  } else {
    return (<div className='landing-page'>
      <h1>Landing page</h1>
      <div>
        <Link to='/signup'>Signup</Link>
        <Link to='/login'>Login</Link>
      </div>
    </div>);
  }
}

