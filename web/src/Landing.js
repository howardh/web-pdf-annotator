import React from 'react';
import {
    Link
} from "react-router-dom";

export default function LandingPage(props) {
  return (<div>
    Landing page
    <div>
      <Link to='/docs'>Documents</Link>
      <Link to='/annotate'>Annotate</Link>
      <Link to='/signup'>Signup</Link>
      <Link to='/login'>Login</Link>
    </div>
  </div>);
}

