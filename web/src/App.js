import React from 'react';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link
} from "react-router-dom";

import './App.css';

import PdfAnnotationContainer from './PdfViewer.js';
import LoginPage from './Login.js';
import SignupPage from './Signup.js';
import LandingPage from './Landing.js';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/signup">
          <SignupPage />
        </Route>
        <Route path="/login">
          <LoginPage />
        </Route>
        <Route path="/annotate">
          <PdfAnnotationContainer />
        </Route>
        <Route path="/">
          <LandingPage />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
