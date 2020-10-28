import React from 'react';
import {useEffect, useState} from 'react';
import {useDispatch,useSelector} from 'react-redux';

import {
  filterDict
} from './Utils.js';
import {
  Checkbox, TextField, Button
} from './Inputs.js';

import {tagActions} from './actions/index.js';

import './Tags.scss';

export default function TagsPage(props) {
  const dispatch = useDispatch();
  const {
    userId
  } = props;

  // All tags, including those owned by someone else
  const tags = filterDict(
    useSelector(state => state.tags.entities),
    e => e && !e.deleted_at
  );

  // Load tags
  useEffect(() => {
    dispatch(tagActions['fetchMultiple']());
  },[]);

  // Filters
  const [searchText,setSearchText] = useState('');
  const filteredTags = filterDict(
    tags,
    tag => { // Must be tagged by all selected filters
      if (tag.name.includes(searchText)) {
        return true;
      }
      if (tag.description.includes(searchText)) {
        return true;
      }
      return false;
    }
  );

  // Selected tags
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const selectedTags = filterDict(filteredTags,
    tag=>selectedTagIds.has(tag.id));
  const selectedAllTags = Object.keys(selectedTags).length > 0 && 
      Object.keys(selectedTags).length === Object.keys(tags).length;
  function toggleSelectTag(id) {
    let temp = new Set(selectedTagIds);
    if (temp.has(id)) {
      temp.delete(id);
    } else {
      temp.add(id);
    }
    setSelectedTagIds(temp);
  }
  function toggleSelectAllTags() {
    if (selectedTagIds.size > 0) {
      setSelectedTagIds(new Set());
    } else {
      setSelectedTagIds(new Set(Object.keys(tags).map(id => parseInt(id))));
    }
  }

  // Callbacks
  function deleteSelectedTags() {
    console.log(['delete',selectedTagIds]);
    for (let id of selectedTagIds) {
      dispatch(tagActions['deleteSingle'](id));
    }
  }

  // Render
  if (!userId) {
    return (<main className='tags-page'>
      <h1>Page not found</h1>
    </main>);
  }

  return (<main className='tags-page'>
    <h1>Tags</h1>
    <TagTable tags={filteredTags} 
        selectedTagIds={selectedTagIds}
        selectedAllTags={selectedAllTags}
        toggleSelectTag={toggleSelectTag}
        toggleSelectAllTags={toggleSelectAllTags}/>
  </main>);
}

function TagTable(props) {
  const {
    tags,
    selectedTagIds,
    selectedAllTags,
    toggleSelectTag,
    toggleSelectAllTags
  } = props;
  const dispatch = useDispatch();

  if (tags.length === 0) {
    return null;
  }

  function deleteTag(tag) {
    if (window.confirm('Are you sure you want to delete tag '+tag.name+'?')) {
      dispatch(tagActions['deleteSingle'](tag.id));
    }
  }

  return (
    <table>
      <thead>
        <tr>
          <th><Checkbox checked={selectedAllTags} onChange={toggleSelectAllTags}/></th>
          <th>Label</th>
          <th>Description</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {
          Object.values(tags).map(tag=>{
            if (!tag) {
              return null;
            }
            return (<tr key={tag.id}>
              <td>
                <Checkbox checked={selectedTagIds.has(tag.id)}
                    onChange={()=>toggleSelectTag(tag.id)}/>
              </td>
              <td>
                {tag.name}
              </td>
              <td>
                {tag.description}
              </td>
              <td>
                <i className='material-icons' onClick={()=>deleteTag(tag)}>
                  delete
                </i>
              </td>
            </tr>);
          })
        }
      </tbody>
    </table>
  );
}
