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
    if (event.target.type==='checkbox') {
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
export const parseQueryString = function(query) {
  if (query.length <= 1) {
    return {};
  }
  if (query[0] === '?') {
    query = query.substr(1);
  }
  return query.split('&')
    .reduce(function(acc, x) {
      var tokens = x.split('=');
      if (tokens.length === 2) {
        acc[tokens[0]] = tokens[1];
      }
      return acc;
    }, {});
}
export function filterDict(dict,filterCondition) {
  return Object.entries(dict).filter(function([k,v]) {
    return filterCondition(v);
  }).reduce((acc,[k,v]) => {
    acc[k] = v;
    return acc;
  }, {});
}
// Date utils
export function toRelativeDateString(date) {
  if (date - new Date(0) === 0) {
    return 'Never';
  }
  const now = new Date();
  const diff = now - date;
  const SEC = 1000;
  const MIN = SEC*60;
  const HOUR = MIN*60;
  const DAY = HOUR*24;
  const YEAR = DAY*365;
  const MONTH = YEAR/12;
  if (diff < 1*HOUR) {
    return Math.floor(diff/MIN)+" min ago";
  }
  if (diff < 1*DAY) {
    let x = Math.floor(diff/HOUR);
    if (x === 1) {
      return "1 hour ago";
    } else {
      return x+" hours ago";
    }
  }
  if (diff < 1*MONTH) {
    let x = Math.floor(diff/DAY);
    if (x === 1) {
      return "1 day ago";
    } else {
      return x+" days ago";
    }
  }
  if (diff < 1*YEAR) {
    let x = Math.floor(diff/MONTH);
    if (x === 1) {
      return "1 month ago";
    } else {
      return x+" months ago";
    }
  }

  let x = Math.floor(diff/YEAR);
  if (x === 1) {
    return "1 year ago";
  } else {
    return x+" years ago";
  }
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
