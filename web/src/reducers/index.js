import { combineReducers } from 'redux';
import { 
  updateLoadingStatus,
} from '../Utils.js';

function createReducer(entityName) {
  let initialState = {
    entities: {}, // Present entities
    dirtyEntities: new Set(), // IDs of entries that were modified
    // Undo/Redo variables
    past: [],
    future: [],
    changed: new Set() 
  }
  return function(state = initialState, action) {
    switch (action.type) {
      case 'FETCH_'+entityName+'_SUCCESS': {
        let entities = action.payload.entities;
        if (entities) {
          return {
            ...state,
            entities: {...state.entities, ...entities}
          };
        } else {
          return state;
        }
      }
      case 'CREATE_'+entityName+'_SUCCESS': {
        let entities = action.payload.entities;
        if (entities) {
          // Update set of changed entities for unto/redo
          let changed = new Set(state.changed);
          let deletedNewEntities = {};
          for (let [k,entity] of Object.entries(entities)) {
            changed.add(k);
            deletedNewEntities[k] = {
              ...entity,
              // Date not exactly correct, but this isn't important
              deleted_at: new Date().toISOString().substr(0,10)
            };
          }
          let newPast = state.past.map(function(p) {
            return {
              entities: {
                ...p.entities,
                ...deletedNewEntities
              },
              changed: p.changed
            };
          });
          // Update state
          return {
            ...state,
            past: newPast,
            changed
          };
        } else {
          return state;
        }
      }
      case 'UPDATE_'+entityName+'_START': {
        let newEntity = action.payload.data;
        let id = newEntity.id;
        // Add to set of dirty entries
        let dirtyEntities = new Set(state.dirtyEntities);
        dirtyEntities.add(id);
        let changed = new Set(state.changed);
        changed.add(id);
        // Look for changed properties
        let oldEntity = state.entities[id];
        let changedProps = [];
        for (let key in oldEntity) {
          if (oldEntity[key] !== newEntity[key]) {
            changedProps.push(key);
          }
        }
        // Create new state
        return {...state,
          entities: {...state.entities, [id]: newEntity},
          dirtyEntities: dirtyEntities,
          changed: changed
        };
      }
      case 'UPDATE_'+entityName+'_SUCCESS': {
        var id = action.payload.id;
        var dirtyEntities = new Set(state.dirtyEntities);
        dirtyEntities.delete(id);
        return {...state,
          dirtyEntities: dirtyEntities
        };
      }
      case 'DELETE_'+entityName+'_SUCCESS': {
        let filters = action.payload.filters;
        // Remove matching entities from `entities`
        let deletedIds = [];
        let filteredKeys = Object.keys(state.entities).filter(function(key){
          let entity = state.entities[key];
          for (let filter of filters) {
            let mismatch = Object.keys(filter).filter(prop => entity[prop] !== filter[prop]);
            if (mismatch.length === 0) {
              deletedIds.push(key);
              return false;
            }
          }
          return true;
        });
        let entities = {};
        filteredKeys.forEach(function(key){
          entities[key] = state.entities[key];
        });
        return {
          ...state,
          entities: entities,
        };
      }
      case 'CLEAR_'+entityName: {
        return initialState;
      }
      case 'SAVE_CHECKPOINT_'+entityName: {
        const max_history_size = 20;
        const {
          past,entities,future,changed
        } = state;
        const present = {entities,changed}
        if (past.length > max_history_size) {
          return {
            ...state,
            past: past.slice(0,-1)+[present],
            future: [],
            changed: new Set()
          }
        } else {
          return {
            ...state,
            past: [...past, present],
            future: [],
            changed: new Set()
          }
        }
      }
      case 'CLEAR_HISTORY_'+entityName: {
        return {
          ...state,
          past: [],
          future: [],
          changed: new Set()
        }
      }
      case 'UNDO_'+entityName: {
        const {
          past,entities,future,changed
        } = state;
        const present = {entities,changed}

        if (past.length === 0) {
          return state;
        }
        return {
          ...state,
          entities: past[past.length-1].entities,
          changed: past[past.length-1].changed,
          past: past.slice(0,-1),
          future: [...future,present],
          dirtyEntities: new Set([...changed,...state.dirtyEntities]),
        };
      }
      case 'REDO_'+entityName: {
        const {
          past,entities,future,changed
        } = state;
        const present = {entities,changed}

        if (future.length === 0) {
          return state;
        }
        return {
          ...state,
          entities: future[future.length-1].entities,
          future: future.slice(0,-1),
          past: [...past,present],
          changed: future[future.length-1].changed,
          dirtyEntities: new Set([
            ...future[future.length-1].changed,
            ...state.dirtyEntities
          ]),
        };
      }
      default:
        return state;
    }
  }
}

function sessionReducer(state = {}, action) {
  switch (action.type) {
    case 'UPDATE_SESSION_SUCCESS': {
      if (isFinite(action.payload.id)) {
        return {
          uid: action.payload.id,
          confirmed: action.payload.confirmed,
        };
      } else {
        return {
          uid: null
        };
      }
    }
    case 'LOGIN_START': {
      return {
        ...state,
        loggingIn: true,
      };
    }
    case 'LOGIN_SUCCESS': {
      return {
        ...state,
        uid: action.payload.id,
        confirmed: action.payload.confirmed,
        error: null
      };
    }
    case 'LOGIN_FAILURE': {
      return {
        ...state,
        uid: null,
        confirmed: null,
        error: action.payload.error
      };
    }
    case 'LOGOUT_SUCCESS': {
      return {};
    }
    default:
      return state;
  }
}

export function loadingStatusReducer(state = {}, action) {
  switch (action.type) {
    case 'LOADING_START': {
      let entityName = action.payload.entityName;
      let filters = action.payload.filters;
      let statusTree = state[entityName];
      let newStatus = updateLoadingStatus(
        statusTree, filters, {status: 'loading'}
      );
      return {
        ...state,
        [entityName]: newStatus
      };
    }
    case 'LOADING_SUCCESS': {
      let entityName = action.payload.entityName;
      let filters = action.payload.filters;
      let statusTree = state[entityName];
      let newStatus = updateLoadingStatus(
        statusTree, filters, {status: 'loaded', time: new Date()}
      );
      return {
        ...state,
        [entityName]: newStatus
      };
    }
    case 'LOADING_FAILURE': {
      let entityName = action.payload.entityName;
      let filters = action.payload.filters;
      let error = action.payload.error;
      let statusTree = state[entityName];
      let newStatus = updateLoadingStatus(
        statusTree, filters, {status: 'error', error: error, time: new Date()}
      );
      return {
        ...state,
        [entityName]: newStatus
      };
    }
    case 'CLEAR_LOADING_STATUS': {
      let entityName = action.payload.entityName;
      let newState = {};
      Object.keys(state).forEach(function(key){
        if (key === entityName) {
          return;
        }
        newState[key] = state[key];
      });
      return newState;
    }
    default:
      return state;
  }
}

const combinedReducer = combineReducers({
  documents: createReducer('DOCUMENTS'),
  annotations: createReducer('ANNOTATIONS'),
  tags: createReducer('TAGS'),
  loadingStatus: loadingStatusReducer,
  session: sessionReducer
});

const rootReducer = function(state, action) {
  if (action.type === 'LOGOUT_SUCCESS') {
    return combinedReducer(undefined, action);
  }
  return combinedReducer(state, action);
}

export default rootReducer;
