// React Utils
export function generateClassNames(cn) {
  return Object.entries(cn).filter(
    ([k,v]) => v
  ).map(
    ([k,v]) => k
  ).join(' ');
}
// Forms
export function formChangeHandler(state,setState) {
  return function(event) {
    if (event.target.type='checkbox') {
      setState({
        ...state,
        [event.target.name]: event.target.checked
      });
    } else {
      setState({
        ...state,
        [event.target.name]: event.target.value
      });
    }
  }
}
// List utils
export function removeFromList(list,elem) {
  let index = list.indexOf(elem);
  if (index === -1) {
    return list;
  }
  return list.slice(0,index).concat(list.slice(index+1))
}
// Dict utils
export function filterDict(dict,filterCondition) {
  return Object.entries(dict).filter(function([k,v]) {
    return filterCondition(v);
  }).reduce((acc,[k,v]) => {
    acc[k] = v;
    return acc;
  }, {});
}
// Math
export function clip(val,min,max) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}
// Store reducer utils
class StatusTreeNode {
  constructor(key, children) {
    this.key = key;
    this.children = children;
  }
}
export function getLoadingStatus(tree, filters, keysToCheck=null) {
	keysToCheck = keysToCheck || new Set(Object.keys(filters));
  if (tree && !(tree instanceof StatusTreeNode)) {
    return tree;
  }
  if (typeof tree === 'undefined' || keysToCheck.size === 0) {
    return null;
  }

  if (!keysToCheck.has(tree.key)) {
    return getLoadingStatus(tree.children[null], filters, keysToCheck);
  } else {
    keysToCheck = new Set(keysToCheck);
    keysToCheck.delete(tree.key);
    return getLoadingStatus(tree.children[filters[tree.key]], filters, keysToCheck) || getLoadingStatus(tree.children[null], filters, keysToCheck);
  }
}
export function updateLoadingStatus(tree, filters, status, keysToCheck=null) {
	keysToCheck = keysToCheck || new Set(Object.keys(filters));
  if (keysToCheck.size === 0) {
    return status;
  }
  if (tree && !(tree instanceof StatusTreeNode)) {
    return tree;
  }
  if (!tree) { // null or undefined tree
    let key = keysToCheck.values().next().value;
    keysToCheck = new Set(keysToCheck);
    keysToCheck.delete(key);
    return new StatusTreeNode(
      key,
      {
        [filters[key]]: updateLoadingStatus(
          null, filters, status, keysToCheck
        )
      }
    );
  }
  if (!keysToCheck.has(tree.key)) {
    return new StatusTreeNode(
      tree.key,
      {
        ...tree.children,
        [null]: updateLoadingStatus(tree[null], filters, status, keysToCheck)
      }
    );
  } else {
    keysToCheck = new Set(keysToCheck);
    keysToCheck.delete(tree.key);
    return new StatusTreeNode(
      tree.key,
      {
        ...tree.children,
        [filters[tree.key]]: updateLoadingStatus(
          null, filters, status, keysToCheck
        )
      }
    );
  }
}
