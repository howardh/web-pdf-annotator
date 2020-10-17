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

import PdfAnnotationContainer from './PdfViewer.js';
import LoginPage from './Login.js';
import SignupPage from './Signup.js';
import LandingPage from './Landing.js';
import DocumentsPage from './Documents.js';

import './App.css';

function App() {
  const dispatch = useDispatch();
  const userId = useSelector(state => state.session.uid);

  useEffect(()=>{
    dispatch(updateSession());
  },[]);

  return (
    <Router>
      <div>
        { userId ? 'Currently logged in as '+userId : 'Not Logged in'}
      </div>
      <Switch>
        <Route path="/signup">
          <SignupPage />
        </Route>
        <Route path="/login">
          <LoginPage />
        </Route>
        <Route path="/docs">
          <DocumentsPage />
        </Route>
        <Route path="/annotate/:docId" component={PdfAnnotationContainer} />
        <Route path="/">
          <LandingPage />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
