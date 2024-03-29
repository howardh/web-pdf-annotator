import axios from 'axios';
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

import PdfAnnotationPage from './AnnotatePage.js';
import PdfViewerPage from './PdfViewer.js';
import LoginPage from './Login.js';
import AccountPage from './Account.js';
import { LogoutPage } from './Login.js';
import SignupPage from './Signup.js';
import LandingPage from './Landing.js';
import DocumentsPage from './Documents.js';
import NotesPage from './Notes.js';
import TagsPage from './Tags.js';
import NoteEditorPage from './NoteEditor.js';

import './App.scss';

function App() {
  const dispatch = useDispatch();
  const userId = useSelector(state => state.session.uid);
  const confirmed = useSelector(state => state.session.confirmed);

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
          <Navigation userId={userId} confirmed={confirmed} />
          <SignupPage />
        </Route>
        <Route path="/login">
          <Navigation userId={userId} confirmed={confirmed} />
          <LoginPage />
        </Route>
        <Route path="/account">
          <Navigation userId={userId} confirmed={confirmed} />
          <AccountPage />
        </Route>
        <Route path="/logout">
          <LogoutPage />
        </Route>
        <Route path="/docs">
          <Navigation userId={userId} confirmed={confirmed} />
          <DocumentsPage userId={userId} />
        </Route>
        <Route path="/annotate/:docId" component={PdfAnnotationPage} />
        <Route path="/pdf/:docId" component={PdfViewerPage} />
        <Route path="/tags">
          <Navigation userId={userId} confirmed={confirmed} />
          <TagsPage userId={userId} />
        </Route>
        <Route path="/notes/:noteId"
          render={
            props => <NoteEditorPage userId={userId} {...props.match.params} />
          }
        />
        <Route path="/notes">
          <Navigation userId={userId} confirmed={confirmed} />
          <NotesPage userId={userId} />
        </Route>
        <Route path="/">
          <Navigation userId={userId} confirmed={confirmed} />
          <LandingPage />
        </Route>
      </Switch>
    </Router>
  );
}

function Logo(props) {
  return (<div className='logo'>
    <Link to='/'>Logo Placeholder</Link>
  </div>)
}

function Navigation(props) {
  const {
    userId,
    confirmed
  } = props;
  if (userId) {
    // <Link to='/notes'>Notes</Link>
    return (<nav>
      <Logo />
      <Link to='/docs'>Documents</Link>
      <Link to='/logout'>Logout</Link>
      <span>
        Currently logged in as 
        <Link to='/account'>{userId}</Link>
      </span>
    </nav>);
  } else {
    return (<nav>
      <Logo />
      <Link to='/signup'>Signup</Link>
      <Link to='/login'>Login</Link>
      <span>
        Not logged in
      </span>
    </nav>);
  }
}

export default App;
