import React, {Fragment} from 'react';
import {useEffect, useState, useRef} from 'react';
import { Link, useHistory } from "react-router-dom";

import {
  filterDict
} from './Utils.js';
import {
  Checkbox
} from './Inputs.js';

import './EntityTable.scss';

export function EntityTable(props) {
  const {
    entities,
    selectedIds,
    onChangeSelectedIds,
    columns,
    renderActionsColumn,
    actions
  } = props;
  function toggleSelectedId(id) {
    let temp = new Set(selectedIds);
    if (temp.has(id)) {
      temp.delete(id);
    } else {
      temp.add(id);
    }
    onChangeSelectedIds(temp);
  }
  function toggleSelectAll() {
    if (selectedIds.size > 0) {
      onChangeSelectedIds(new Set());
    } else {
      onChangeSelectedIds(new Set(
        entities.map(entity => parseInt(entity.id))
      ));
    }
  }
  return (<div className='table-container'>
    <TableActions selectedIds={selectedIds} actions={actions} />
    <Table columns={columns} renderActions={renderActionsColumn}
      entities={entities}
      selectedIds={selectedIds}
      toggleSelectAll={toggleSelectAll}
      toggleSelectEntity={toggleSelectedId}
      />
  </div>);
}

function TableActions(props) {
  const { selectedEntities,
    selectedIds,
    actions = []
  } = props;

  return (<div className='table-actions'>
    {
      actions.filter(
        action => action.renderCondition(selectedIds)
      ).map(
        action => <Fragment key={action.tooltip}>
          { action.render() }
        </Fragment>
      )
    }
  </div>);
}

function Table(props) {
  const {
    entities,
    selectedIds,
    toggleSelectEntity,
    toggleSelectAll,
    columns = [],
    renderActions = entity => null,
    renderEmpty = () => 'Nothing to see here',
  } = props;

  const selectedEntities = filterDict(entities,
    entity=>selectedIds.has(entity.id));
  const selectedAllEntities = Object.keys(selectedEntities).length > 0 && 
      Object.keys(selectedEntities).length === Object.keys(entities).length;

  return (
    <table>
      <thead>
        <tr>
          <th><Checkbox checked={selectedAllEntities} onChange={toggleSelectAll}/></th>
          {
            columns.map(col => <th key={col.heading}>{col.heading}</th>)
          }
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {
          entities.map(entity=>{
            if (!entity) {
              return null;
            }
            return (<tr key={entity.id}>
              <td className='checkbox'>
                <Checkbox checked={selectedIds.has(entity.id)}
                    onChange={()=>toggleSelectEntity(entity.id)}/>
              </td>
              {
                columns.map(col =>
                  <td key={col.heading} className={col.className}>
                    {col.render(entity)}
                  </td>
                )
              }
              <td className='actions'>
                { renderActions(entity) }
              </td>
            </tr>);
          })
        }
        {
          entities.length === 0 &&
          <tr>
            <td colSpan={columns.length+2} className='empty'>
              {renderEmpty()}
            </td>
          </tr>
        }
      </tbody>
    </table>
  );
}
