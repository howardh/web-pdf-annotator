import React from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link } from "react-router-dom";
import {SignupForm} from './Signup.js';

import './Landing.scss';

export default function LandingPage(props) {
  const userId = useSelector(state => state.session.uid);

  if (userId) {
    return (<main className='landing-page'>
      <h1>PDF Annotation Tool</h1>
    </main>);
  } else {
    return (<main className='landing-page'>
      <div className='row'>
        <div className='description'>
          <h1>PDF Annotation Tool</h1>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu ligula vulputate, viverra lorem eu, ultricies ante. Phasellus lacinia lobortis neque, in dictum libero ornare ut. Morbi ac enim sed nisi commodo fermentum. Nunc fermentum laoreet dolor, sit amet hendrerit erat auctor quis. Integer eleifend, sapien sed pellentesque imperdiet, quam metus pretium lacus, ut sollicitudin lacus lorem eu dui. Cras eu egestas odio. Sed sed dolor purus.
          </p>
          <p>
            Morbi suscipit augue vel massa finibus, vel ultrices tellus maximus. Ut ex elit, dictum vitae metus quis, efficitur dictum metus. Nam porttitor arcu nec ipsum tristique hendrerit sed sit amet purus. Ut ac metus et magna suscipit varius. Cras mollis laoreet nisi, sed placerat sem pharetra id. Nullam euismod risus non neque efficitur, quis scelerisque metus varius. Duis ex libero, convallis nec erat sit amet, interdum aliquam est. In in quam a leo pretium varius. Phasellus tristique scelerisque mollis. Curabitur eget feugiat augue. Praesent faucibus ullamcorper commodo. Nunc blandit ornare erat, molestie feugiat arcu varius nec. Vestibulum ornare eu dolor nec porttitor. Morbi gravida tortor neque, ultricies eleifend dui molestie lobortis. Sed vel molestie ante. 
          </p>
        </div>
        <SignupForm />
      </div>
    </main>);
  }
}

