import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { toRelativeDateString } from 'Utils.js';
import { LabelledCheckbox } from 'atoms/Checkbox.js';
import { ButtonIcon } from 'atoms/Button.js';

import styles from './Table.module.scss';

function Table(props) {
  const {
    className='',
    // List
    //  objects
    //    render: datum => DOM
    //    heading: string
    //    classNameHeading: string
    //    classNameContent: string
    cols = [],
    // List of datum
    data = {},
    // List
    //  objects
    //    render: datum => DOM
    actions = null,
    // List
    //  objects
    //    render: datum => DOM
    //    renderCondition: datum => bool
    batchActions= null,
    // Boolean
    selectable = false,
    // Set of keys
    selected = new Set(),
    // set of keys => null
    onChangeSelected = ()=>{},
  } = props;

  function toggleSelectedId(id) {
    let temp = new Set(selected);
    if (temp.has(id)) {
      temp.delete(id);
    } else {
      temp.add(id);
    }
    onChangeSelected(temp);
  }
  function toggleSelectAll() {
    if (selected.size > 0) {
      onChangeSelected(new Set());
    } else {
      onChangeSelected(new Set(
        Object.keys(data)
      ));
    }
  }

  const batchActionsDom = batchActions.filter(
    action => action.renderCondition(selected)
  ).map(
    action => action.render(selected)
  )

  const numCols = cols.length + selectable + !!actions;

  return (<table className={[styles['table'],className].join(' ')}>
    <thead className={styles['table-head']}>
      <tr>
        { selectable &&
          <th className={[
              styles['table-cell'],
              styles['table-cell__heading'],
              styles['table-cell__checkbox']
            ].join(' ')}>
            <LabelledCheckbox onClick={toggleSelectAll}/>
          </th>
        }
        {
          cols.map(
            col => 
            <th className={[
                styles['table-cell'],
                styles['table-cell__heading'],
                col.classNameHeading
              ].join(' ')}>
              {col.heading}
            </th>
          )
        }
        {
          actions &&
          <th className={[
              styles['table-cell'],
              styles['table-cell__heading'],
              styles['table-cell__actions']
            ].join(' ')}>
          </th>
        }
      </tr>
    </thead>
    <tbody className={styles['table-body']}>
      {
        Object.entries(data).map(
          ([key,datum]) =>
          <tr className={styles['table-row']} key={key}>
            { 
              selectable &&
              <td className={styles['table-cell__checkbox']}>
                <LabelledCheckbox
                  onClick={()=>toggleSelectedId(key)}
                  checked={selected.has(key)}/>
              </td>
            }
            {
              cols.map(
                col =>
                <td className={[
                    styles['table-cell'],
                    col.classNameContent
                  ].join(' ')}
                  key={col.heading}
                  >
                  {col.render(datum)}
                </td>
              )
            }
            {
              actions &&
              <td className={[
                  styles['table-cell'],
                  styles['table-cell__heading'],
                  styles['table-cell__actions']
                ].join(' ')}>
                <Actions>
                  {
                    actions.map(
                      action => action.render(datum)
                    )
                  }
                </Actions>
              </td>
            }
          </tr>
        )
      }
      {
        batchActionsDom.length > 0 &&
        <tr>
          <td colSpan={numCols}>
            <div className={styles['table-cell__batch-actions']}>
              {batchActionsDom}
            </div>
          </td>
        </tr>
      }
    </tbody>
  </table>);
}

function Actions(props) {
  const {
    children=null
  } = props;
  const [expanded,setExpanded] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (expanded) {
      function listener(e) {
        if (ref.current.contains(e.target)) {
          return;
        }
        setExpanded(false);
      }
      document.addEventListener('click', listener);
      return () => {
        document.removeEventListener('click',listener);
      }
    }
  }, [expanded]);
  return (
    <div className={styles['actions']} ref={ref}>
      <i className='material-icons' onClick={()=>setExpanded(!expanded)}>
        more_horiz
      </i>
      {
        expanded &&
        <div className={styles['actions__popup']}>
          {children}
        </div>
      }
    </div>
  )
}

export { Table };
