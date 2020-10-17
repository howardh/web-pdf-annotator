import axios from 'axios';
import { createStore, applyMiddleware } from "redux";
import thunkMiddleware from 'redux-thunk';

import rootReducer from "../reducers/index";

const store = createStore(
  rootReducer,
  applyMiddleware(
    thunkMiddleware
  )
);

function initDirtyEntityWatcher(entityName, upperEntityName, path, debounceTime) {
  var updateTimeout = null;
  var lastDirtyEntities = new Set();
  store.subscribe(function(){
    var currentDirtyEntities = store.getState()[entityName].dirtyEntities;
    if (lastDirtyEntities.size === currentDirtyEntities.size) {
      var same = Array.from(lastDirtyEntities)
        .map((x) => currentDirtyEntities.has(x))
        .reduce((a,b) => a && b, true);
      if (same) {
        return;
      }
    }
    clearTimeout(updateTimeout);
    lastDirtyEntities = new Set(currentDirtyEntities);
    if (currentDirtyEntities.size === 0) {
      return;
    }
    updateTimeout = setTimeout(
      function() { // Update one at a time
        var id = lastDirtyEntities.values().next().value;
        console.log(lastDirtyEntities);
        var data = store.getState()[entityName].entities[id];
        axios.put(
          process.env.REACT_APP_SERVER_ADDRESS+path+id,
          data,
          {withCredentials: true}
        ).then(function(response){
          store.dispatch({
            type: 'UPDATE_'+upperEntityName+'_SUCCESS',
            payload: {
              id: id
            }
          });
        });
      }, debounceTime
    );
  });
}

let debounceTime = 500;
initDirtyEntityWatcher('documents', 'DOCUMENTS', '/data/documents/', debounceTime);
initDirtyEntityWatcher('annotations', 'ANNOTATIONS', '/data/annotations/', debounceTime);

window.store = store;

export default store;
