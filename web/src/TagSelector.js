import React from 'react';
import {useEffect, useState, useRef, useMemo} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link, useHistory } from "react-router-dom";
import { createSelector } from 'reselect';

import {
  TextField, Button, GroupedInputs, Tooltip
} from './Inputs.js';
import {
  filterDict,generateClassNames,removeFromList
} from './Utils.js';
import {tagActions} from './actions/index.js';

import './TagSelector.scss';

export function TagSelector(props) {
  const {
    tags = {},
    selectedTags=new Set(), partiallySelectedTags=new Set(),
    onToggleTagId = () => null,
    allowCreation = false,
  } = props;
  const dispatch = useDispatch();

  const [tagSearchValue,setTagSearchValue] = useState('');
  const filteredTags = filterDict(tags, t => t.name.includes(tagSearchValue));
  const exactMatch = Object.values(filteredTags).filter(t => t.name === tagSearchValue);

  function createTag() {
    let tag = {
      name: tagSearchValue
    };
    dispatch(tagActions['create'](tag)).then(()=>{
      setTagSearchValue('');
    });
  }

  return (<div className='tag-selector'>
    <div className='selector'>
      <div className='selected-tags'></div>
      <input type='text' name='search' value={tagSearchValue} onChange={e=>setTagSearchValue(e.target.value)} placeholder='(Enter a tag name to search/create)'/>
    </div>
    <div className='dropdown'>
      {
        exactMatch.length === 0 &&
        tagSearchValue.trim().length > 0 &&
        (
          allowCreation &&
          <Button onClick={createTag}>
            Create Tag: {tagSearchValue}
          </Button>
        )
      }
      {
        Object.values(filteredTags).map(tag => {
          const classNames = generateClassNames({
            tag: true,
            selected: selectedTags.has(tag.name),
            partial: partiallySelectedTags.has(tag.name)
          })
          return (
            <div className={classNames} key={tag.id}
                onClick={()=>onToggleTagId(tag.id)}>
              {tag.name}
            </div>
          );
        })
      }
    </div>
  </div>);
}

export function TagEditor(props) {
  const {
    entities, // Entities whose tags are being modified
    updateEntity
  } = props;

  const dispatch = useDispatch();

  const [visible,setVisible] = useState(false);

  const numEntities = Object.keys(entities).length;
  const tags = useSelector(state => state.tags.entities);
  const ref = useRef(null);

  useEffect(()=>{
    if (!visible) {
      return;
    }
    if (setVisible) {
      function handleClick(e) {
        if (ref.current && !ref.current.contains(e.target)) {
          setVisible(false);
        }
      }
      document.addEventListener('click',handleClick);
      return () => {
        document.removeEventListener('click',handleClick);
      }
    }
  },[visible]);

  const tagSelectionCount = Object.values(
    entities
  ).map(
    e => e.tag_names
  ).reduce((acc,tagNames) => {
    for (let name of tagNames) {
      if (!acc[name]) {
        acc[name] = 1;
      } else {
        acc[name] += 1;
      }
    }
    return acc;
  }, {});

  function toggleTag(tagId) {
    const name = tags[tagId].name;
    if (tagSelectionCount[name] > 0) {
      // Remove
      for (let e of Object.values(entities)) {
        let newEntity = {
          ...e,
          tag_names: removeFromList(e.tag_names,name)
        }
        updateEntity(newEntity);
      }
    } else {
      // Add
      for (let e of Object.values(entities)) {
        let newEntity = {
          ...e,
          tag_names: e.tag_names.indexOf(name) === -1 
              ? [...e.tag_names, name]
              : e.tag_names
        }
        updateEntity(newEntity);
      }
    }
  }

  let selectedTags = new Set(Object.entries(tagSelectionCount).filter(
    ([k,v]) => v === numEntities
  ).map( ([k,v]) => k ));
  let partiallySelectedTags = new Set(Object.entries(tagSelectionCount).filter(
    ([k,v]) => v > 0 && v < numEntities
  ).map( ([k,v]) => k ));
  return (
    <div className='tag-editor-container' ref={ref}>
      <Button onClick={()=>setVisible(!visible)}>
        <i className='material-icons'>label</i>
        <Tooltip>Edit Tags</Tooltip>
      </Button>
      { visible &&
        <div className='dropdown'>
          <TagSelector
            tags={tags}
            selectedTags={selectedTags}
            partiallySelectedTags={partiallySelectedTags}
            onToggleTagId={toggleTag}
            allowCreation={true}
          />
        </div>
      }
    </div>
  );
}

export function TagFilter(props) {
  const {
    selectedTags,
    onChangeSelectedTags,
  } = props;

  const dispatch = useDispatch();

  const [visible,setVisible] = useState(false);

  const tags = useSelector(state => state.tags.entities);
  const ref = useRef(null);

  useEffect(()=>{
    if (!visible) {
      return;
    }
    if (setVisible) {
      function handleClick(e) {
        if (ref.current && !ref.current.contains(e.target)) {
          setVisible(false);
        }
      }
      document.addEventListener('click',handleClick);
      return () => {
        document.removeEventListener('click',handleClick);
      }
    }
  },[visible]);

  function toggleTag(tagId) {
    const tagName = tags[tagId].name;
    if (selectedTags.has(tagName)) {
      let temp = new Set(selectedTags);
      temp.delete(tagName);
      onChangeSelectedTags(temp);
    } else {
      onChangeSelectedTags(new Set(selectedTags).add(tagName));
    }
  }

  return (
    <div className='tag-filter-container' ref={ref}>
      <Button onClick={()=>setVisible(!visible)}>
        <i className='material-icons'>filter_list</i>
        <Tooltip>Select Tag Filter</Tooltip>
      </Button>
      { visible &&
        <TagSelector
          tags={tags}
          selectedTags={selectedTags}
          onToggleTagId={toggleTag}
          allowCreation={false}
        />
      }
    </div>
  );
}
