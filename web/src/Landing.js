import React from 'react';
import {
    Link
} from "react-router-dom";
import {QueryRenderer} from 'react-relay';
import graphql from 'babel-plugin-relay/macro';

import environment from './environment.js';

export default function LandingPage(props) {
  return (<div>
    Landing page
    <div>
      <Link to='/docs'>Documents</Link>
      <Link to='/annotate'>Annotate</Link>
      <Link to='/signup'>Signup</Link>
      <Link to='/login'>Login</Link>
    </div>
    <QueryRenderer
      environment={environment}
      query={graphql`
        query LandingQuery {
          users {
            id
          }
        }
      `}
      variables={{}}
      render={({error, props}) => {
        if (error) {
          return <div>Error!</div>;
        }
        if (!props) {
          return <div>Loading...</div>;
        }
        return <div>User ID: {props.users.id}</div>;
      }}
    />
  </div>);
}

