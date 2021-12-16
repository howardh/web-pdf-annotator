import React from 'react';

import { DropdownInput } from 'atoms/Input.js';
import { Tag } from 'atoms/Tag.js';

import styles from './TagSelect.module.scss';

function TagSelect(props) {
  const {
    className = '',
    value = '',
    onChangeValue = () => null,
    selected = new Set(), // Selected IDs
    onChangeSelected = () => null,
    onCreateNewTag = null,
    tags = {},
  } = props;

  function toggleSelected(id) {
    let newSel = new Set(selected);
    console.log(id);
    if (selected.has(id)) {
      newSel.delete(id);
    } else {
      newSel.add(id);
    }
    onChangeSelected(newSel);
  }
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.target.blur();
    }
  }

  // Render list of filtered tags
  function render() {
    let filteredTags = Object.values(tags)
      .filter(tag => tag.name.includes(value));
    if (filteredTags.length === 0) {
      if (onCreateNewTag) {
        return (
          <div className={styles['tag-select__dropdown']}>
            <Tag
              className={styles['tag']}
              onClick={()=>onCreateNewTag(value)}>
                {value}
            </Tag>
          </div>
        );
      } else {
        return (
          <div className={styles['tag-select__dropdown']}>
            No matching tags found
          </div>
        );
      }
    } else {
      return (
        <div className={styles['tag-select__dropdown']}>
          {
            filteredTags.map(
                tag =>
                  <Tag key={tag.id}
                    className={styles['tag']}
                    onClick={()=>toggleSelected(tag.id)}>
                      {tag.name}
                  </Tag>
            )
          }
        </div>
      );
    }
  }

  return (
    <div className={[styles['tag-select'],className].join(' ')}>
      <DropdownInput
        value={value}
        onChange={e => onChangeValue(e.target.value)}
        onKeyDown={handleKeyDown}
        dropdown={render}/>
      <div className={styles['tag-select__selected']}>
        {
          Array.from(selected).map(
            id => 
              <Tag key={id}
                className={styles['tag']}
                onClick={()=>toggleSelected(id)}>
                  {tags[id].name}
              </Tag>
          )
        }
      </div>
    </div>
  );
}

export { TagSelect };

