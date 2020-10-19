import axios from 'axios';
import { 
  getLoadingStatus,
} from '../Utils.js';

function toUpperCaseSnakeCase(str) {
  return str.split(/(?=[A-Z])/).join('_').toUpperCase()
}

function createActions(dataType, path, autosortProps) {
  // Process path. If it should start with a / but not end with one.
  if (!path.startsWith('/')) {
    path = '/'+path;
  }
  if (path.endsWith('/')) {
    path = path.substr(0, path.length-1);
  }

  function updateStore(dispatch, response) {
    if (response.data.entities) {
      for (let [eType,entities] of Object.entries(response.data.entities)) {
        dispatch({ 
          type: 'FETCH_'+toUpperCaseSnakeCase(eType)+'_SUCCESS',
          payload: {
            entities: entities
          }
        });
      }
    }
    if (response.data.new_entities) {
      for (let [eType,entities] of Object.entries(response.data.new_entities)) {
        dispatch({ 
          type: 'CREATE_'+toUpperCaseSnakeCase(eType)+'_SUCCESS',
          payload: {
            entities: entities
          }
        });
      }
    }
    if (response.data.summary) {
      dispatch({ 
        type: 'FETCH_'+dataType+'_SUCCESS',
        payload: {
          summary: response.data.summary
        }
      });
    }
  }

  return {
    fetchSingle: function(id) {
      console.log('FETCH '+dataType);
      return function(dispatch, getState) {
        // Send request
        return axios.get(
          process.env.REACT_APP_SERVER_ADDRESS+path+'/'+(id || ''),
          {
            withCredentials: true
          }
        ).then(function(response){
          // Update data
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    fetchMultiple: function(filters, cache=true) {
      filters = filters || {};
      console.log('FETCH '+dataType);
      return function(dispatch, getState) {
        // Check if this is already loading/loaded
        if (filters && cache) {
          let status = getLoadingStatus(getState().loadingStatus[dataType], filters);
          // Check if there was an error. (TODO)
          // If not, then skip sending the request
          if (status) {
            console.log('Already loaded. Skipping.');
            return;
          }
        }
        // Save 'loading' status
        dispatch({
          type: 'LOADING_START',
          payload: {
            entityName: dataType,
            filters: filters
          }
        });
        // Send request
        return axios.get(
          process.env.REACT_APP_SERVER_ADDRESS+path,
          {
            params: filters, 
            withCredentials: true
          }
        ).then(function(response){
          // Update data
          updateStore(dispatch, response);
          // Save 'loaded' status
          dispatch({
            type: 'LOADING_SUCCESS',
            payload: {
              entityName: dataType,
              filters: filters
            }
          });
          return response;
        }).catch(function(error){
          // Set 'error' status
          console.log(error);
          console.log(path)
          window.error = error;
          dispatch({
            type: 'LOADING_FAILURE',
            payload: {
              entityName: dataType,
              filters: filters,
              error: error.response ? error.response.data.error : error.message
            }
          });
          return error;
        });
      }
    },
    create: function(newEntity, progressCallback=()=>null) {
      console.log('CREATE '+dataType);
      // Check what kind of entity we're creating
      // If it's a JSON object, then send as application/json
      // If it's a FormData (probably a file), send as multipart/form-data
      let contentType = 'application/json';
      if (newEntity.constructor.name === 'FormData') {
        contentType = 'multipart/form-data';
      }
      return function(dispatch) {
        return axios.post(
          process.env.REACT_APP_SERVER_ADDRESS+path,
          newEntity,
          {
            headers: {
              'Content-Type': contentType
            },
            withCredentials: true,
            onUploadProgress: progressCallback
          }
        ).then(function(response){
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    update: function(data) {
      console.log('UPDATE '+dataType);
      console.log(data);
      return {
        type: 'UPDATE_'+dataType+'_START',
        payload: {
          data: data
        }
      }
    },
    updateNow: function(data) {
      console.log('UPDATE '+dataType);
      console.log(data);
      return function(dispatch) {
        return axios.put(
          process.env.REACT_APP_SERVER_ADDRESS+path+'/'+data.id,
          data,
          {withCredentials: true}
        ).then(function(response){
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    deleteSingle: function(id) {
      console.log('DELETE '+dataType);
      return function(dispatch) {
        return axios.delete(
          process.env.REACT_APP_SERVER_ADDRESS+path+'/'+id,
          {withCredentials: true}
        ).then(function(response) {
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    deleteMultiple: function(filters) {
      console.log('DELETE '+dataType);
      return function(dispatch) {
        return axios.delete(
          process.env.REACT_APP_SERVER_ADDRESS+path,
          {data: filters, withCredentials: true}
        ).then(function(response) {
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    clear: function() {
      console.log('CLEAR '+dataType);
      return function(dispatch) {
        dispatch({
          type: 'CLEAR_'+dataType,
        });
        dispatch({
          type: 'CLEAR_LOADING_STATUS',
          payload: {
            entityName: dataType
          }
        });
      }
    },
    clearHistory: function() {
      return function(dispatch) {
        dispatch({
          type: 'CLEAR_HISTORY_'+dataType
        });
      }
    },
    saveCheckpoint: function() {
      return function(dispatch) {
        dispatch({
          type: 'SAVE_CHECKPOINT_'+dataType
        });
      }
    },
    undo: function() {
      return function(dispatch) {
        dispatch({
          type: 'UNDO_'+dataType
        });
      }
    },
    redo: function() {
      return function(dispatch) {
        dispatch({
          type: 'REDO_'+dataType
        });
      }
    },
  }
}

export const updateSession = function(){
  return function(dispatch) {
    dispatch({
      type: 'UPDATE_SESSION_START'
    });
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/auth/current_session",
      {withCredentials: true}
    ).then(function(response){
      dispatch({ 
        type: 'UPDATE_SESSION_SUCCESS',
        payload: response.data
      });
    }).catch(function(response){
      dispatch({ 
        type: 'UPDATE_SESSION_FAILURE',
        payload: response.error
      });
    });
  }
}

export const login = function(email, password, remember){
  return function(dispatch) {
    dispatch({type: 'LOGIN_START'});
    return axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/auth/login",
      {email: email, password: password, permanent: remember},
      {withCredentials: true}
    ).then(function(response){
      window.loginresponse = response;
      dispatch({ 
        type: 'LOGIN_SUCCESS',
        payload: {id: response.data.id}
      });
      return true;
    }).catch(function(error){
      let message = "Unspecified error.";
      if (error.response && error.response.data) {
        message = error.response.data.error || message;
      } else {
        message = error.message || message;
      }
      dispatch({ 
        type: 'LOGIN_FAILURE',
        payload: {error: message}
      });
      return false;
    });
  }
}

export const logout = function(){
  return function(dispatch) {
    dispatch({type: 'LOGOUT_START'});
    return axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/auth/logout",
      {withCredentials: true}
    ).then(function(response){
      dispatch({type: 'LOGOUT_SUCCESS'});
      return response;
    });
  }
}

export const documentActions = createActions('DOCUMENTS', '/data/documents');
export const annotationActions = createActions('ANNOTATIONS', '/data/annotations');
