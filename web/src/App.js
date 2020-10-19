import React from 'react';
import {useDispatch,useSelector} from 'react-redux';
import {useEffect, useState} from 'react';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link
} from "react-router-dom";

import {updateSession} from './actions/index.js';

import PdfAnnotationPage from './PdfViewer.js';
import LoginPage from './Login.js';
import { LogoutPage } from './Login.js';
import SignupPage from './Signup.js';
import LandingPage from './Landing.js';
import DocumentsPage from './Documents.js';

import './App.scss';

function App() {
  const dispatch = useDispatch();
  const userId = useSelector(state => state.session.uid);
  const dirty = useSelector(
    state =>
      state.documents.dirtyEntities.size > 0 ||
      state.annotations.dirtyEntities.size > 0
  );

  useEffect(()=>{ // Prevent leaving unsaved data
    if (dirty) {
      window.onbeforeunload = () => true;
      return ()=>{
        window.onbeforeunload = () => null;
      };
    }
  },[dirty]);

  useEffect(()=>{
    dispatch(updateSession());
  },[]);

  return (
    <Router>
      <Switch>
        <Route path="/signup">
          <Navigation userId={userId} />
          <SignupPage />
        </Route>
        <Route path="/login">
          <Navigation userId={userId} />
          <LoginPage />
        </Route>
        <Route path="/logout">
          <LogoutPage />
        </Route>
        <Route path="/docs">
          <Navigation userId={userId} />
          <DocumentsPage userId={userId} />
        </Route>
        <Route path="/annotate/:docId" component={PdfAnnotationPage} />
        <Route path="/">
          <Navigation userId={userId} />
          <LandingPage />
        </Route>
      </Switch>
    </Router>
  );
}

function Navigation(props) {
  const {
    userId
  } = props;
  if (userId) {
    return (<nav>
      <Link to='/docs'>Documents</Link>
      <Link to='/logout'>Logout</Link>
      <span>
        Currently logged in as {userId}
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

export default App;
