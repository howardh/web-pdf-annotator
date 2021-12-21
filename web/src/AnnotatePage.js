import React from 'react';
import { useEffect, useState, useRef, useCallback, useContext, useMemo } from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { useParams, useLocation, useHistory } from "react-router-dom";
import { createSelector } from 'reselect';
import * as pdfjsLib from 'pdfjs-dist/webpack';

import { LabelledCheckbox } from 'atoms/Checkbox.js';
import { Input, LabelledInput, LabelledTextArea } from 'atoms/Input.js';
import { Button, ButtonIcon } from 'atoms/Button.js';
import { GroupedInputs } from 'molecules/GroupedInput.js';
import { Tooltip } from 'atoms/Tooltip.js';
import TextEditor from './TextEditor';
import { NoteViewer } from './NoteEditor.js';
import {
  clip,filterDict,generateClassNames,formChangeHandler,parseQueryString,toQueryString,useSemiState
} from './Utils.js';
import {
  documentActions,annotationActions,noteActions
} from './actions/index.js';
import { PdfViewer, usePdfViewerState } from './PdfViewer.js';

import './AnnotatePage.scss';

/*
Misc notes:
- Active vs Selected annotation
  - Active means the user is working on something related to that annotation (e.g. working on the note associated with it)
  - Selected means the user is actively working on the annotation itself (e.g. resizing, moving, deleting)
*/

const pdfAnnotationPageContext = React.createContext({});

//////////////////////////////////////////////////
// Query String State
//////////////////////////////////////////////////

const qState = (function(){
  const VALID_VARS = ['tab', 'note', 'annotation', 'page', 'y', 'x', 'dest'];

  function validateKeys(keys) {
    for (let k of keys) {
      if (VALID_VARS.includes(k)) {
        continue;
      }
      console.error(`Invalid query string keys (${k}).`);
      return false;
    }
    return true;
  }

  function set(history, vals, maintain=[]) {
    if (!validateKeys(Object.keys(vals))) {
      return;
    }
    const q = parseQueryString(history.location.search);
    let q2 = {};
    for (let k of maintain) {
      if (q[k]) {
        q2[k] = q[k];
      }
    }
    history.push(toQueryString({...q2, ...vals}), 
      { id: (history.location.state?.id || 0)+1 }
    );
  }

  function replace(history, vals) {
    history.replace(
      toQueryString(vals), 
      history.location.state?.id
    );
  }

  function get(history, key=null) {
    const q = parseQueryString(history.location.search);
    if (!key) {
      return q;
    }
    if (!validateKeys([key])) {
      return null;
    }
    return q[key];
  }

  return {
    set, get, replace
  };
})();

//////////////////////////////////////////////////
// Annotations
//////////////////////////////////////////////////

function getClassNames(elem) {
  if (elem.tagName === 'path') {
    return elem.className.baseVal.split(' ');
  } else {
    return elem.className.split(' ');
  }
}

function AnnotationLayer(props) { const {
    annotations,
    eventHandlers,
    page,
    pageNum,
    scale,
    activeId,
    cardInView,
    toolState, setToolState
  } = props;

  const ref = useRef(null);

  const [startMouseCoord,setStartMouseCoord] = useState(null);
  const [mouseMoved,setMouseMoved] = useState(false);
  const [focusedId,setFocusedId] = useState(null); // In case something drawn on the canvas is focused

  // Event Handlers
  function getCoordsFromEvent(event) {
    // Ensure that the coordinates are relative to the correct element
    const rect = ref.current.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left)/scale;
    const offsetY = (event.clientY - rect.top)/scale;
    return [offsetX,offsetY];
  }
  function getAnnotationFromElem(elem) {
    const id = elem.dataset.annotationId;
    if (!id || id === 'temp') {
      return null;
    }
    return annotations[id];
  }
  function handleClick(event) {
    const coords = getCoordsFromEvent(event);
    const ann = getAnnotationFromElem(event.target);
    const data = {
      page: pageNum,
      coords,
      ann
    };
    const classNames = getClassNames(event.target);

    // Clicked on PDF
    let callback = null;
    if (!ann) {
      setFocusedId(null); // Unfocus if nothing was clicked
      // If annotations haven't been clicked...
      callback = eventHandlers.pdf.onClick;
    } else if (classNames.indexOf('annotation') !== -1) {
      callback = eventHandlers.annotation.onClick;
    } else if (classNames.indexOf('control') !== -1) {
      // Nothing to do
    }
    if (callback) {
      callback({event, data, toolState, setToolState});
    }
  }
  function handleDoubleClick(event) {
    const coords = getCoordsFromEvent(event);
    const ann = getAnnotationFromElem(event.target);
    const data = {
      page: pageNum,
      coords,
      ann
    };

    const classNames = getClassNames(event.target);
    let callback = null;
    if (!ann) {
      callback = eventHandlers.pdf.onDoubleClick;
    } else if (classNames.indexOf('annotation') !== -1) {
      callback = eventHandlers.annotation.onDoubleClick;
    } else if (classNames.indexOf('control') !== -1) {
      callback = eventHandlers.controlPoint.onDoubleClick;
    }
    if (callback) {
      callback({event, data, toolState, setToolState});
    }
  }
  function handleMouseDown(event) {
    const coords = getCoordsFromEvent(event);
    setStartMouseCoord(coords);
    const data = {
      page: pageNum,
      coords
    };

    const classNames = getClassNames(event.target);

    let callback = null;
    if (event.target === ref.current) {
      callback = eventHandlers.pdf.onMouseDown;
    } else if (classNames.indexOf('annotation') !== -1) {
      callback = eventHandlers.annotation.onMouseDown;
    } else if (classNames.indexOf('control') !== -1) {
      callback = eventHandlers.controlPoint.onMouseDown;
    }
    if (callback) {
      callback({event, data, toolState, setToolState});
    }
  }
  function handleMouseUp(event) {
    const coords = getCoordsFromEvent(event);
    const data = {
      page: pageNum,
      coords,
      mouseMoved,
      startMouseCoord
    };
    if (mouseMoved) {
      let callback = eventHandlers.onMouseUp;
      if (callback) {
        callback({event, data, toolState, setToolState});
      }
    }
    setStartMouseCoord(null);
    setMouseMoved(false);
  }
  function handleMouseMove(event) {
    const coords = getCoordsFromEvent(event);
    setMouseMoved(true);
    if (!startMouseCoord) {
      return;
    }
    const data = {
      page: pageNum,
      coords,
      startMouseCoord,
    };
    let callback = eventHandlers.onMouseMove;
    if (callback) {
      callback({event, data, toolState, setToolState});
    }
  }

  return <div className='custom-annotation-layer'
        ref={ref}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick} onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} >
    {
      Object.values(annotations).map(annotation =>
        activeId===annotation.id ? null :
        <Annotation annotation={annotation}
          key={annotation.id}
          isActive={false}
          scale={scale}
          toolState={toolState} />
      )
    }
    {
      activeId && annotations[activeId] &&
      <Annotation annotation={annotations[activeId]}
        key={activeId}
        isActive={true}
        viewNote={()=>cardInView.setValue(annotations[activeId].note_id)}
        scale={scale}
        toolState={toolState} />
    }
    { 
      toolState.tempAnnotation && 
      <Annotation annotation={toolState.tempAnnotation} 
        key='temp'
        scale={scale}
        toolState={toolState} />
    }
  </div>;
}

function Annotation(props) {
  const {
    annotation,
    toolState,
    scale,
    isActive,
    viewNote,

    onClick,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onKeyDown,
    onDoubleClick,
  } = props;

  let style = null;
  let selected = false;
  let ann = annotation;
  if (annotation.id === toolState.selectedAnnotationId) {
    selected = true;
    ann = {
      ...ann,
      position: toolState.tempPosition || ann.position
    }
  }

  let classNames = {
    annotation: true,
    selected,
    active: isActive
  }
  switch (ann.type) {
    case 'point':
      style = {
        left: ann.position.coords[0]*scale,
        top: ann.position.coords[1]*scale,
      };
      classNames['point'] = true;
      return <div className={generateClassNames(classNames)}
        data-annotation-id={ann.id}
        id={'annotation'+ann.id}
        style={style}>
        {
          isActive && 
          <AnnotationActions annotation={annotation} viewNote={viewNote}/>
        }
      </div>;
    case 'rect':
      style = {
        top: ann.position.box[0]*scale,
        left: ann.position.box[3]*scale,
        height: (ann.position.box[2]-ann.position.box[0])*scale,
        width: (ann.position.box[1]-ann.position.box[3])*scale,
      };
      classNames['rect'] = true;
      return <div className={generateClassNames(classNames)}
        data-annotation-id={ann.id}
        id={'annotation'+ann.id}
        style={style}>
        {
          selected &&
          <>
          <div className='control nw' data-annotation-id={ann.id} />
          <div className='control n'  data-annotation-id={ann.id} />
          <div className='control ne' data-annotation-id={ann.id} />
          <div className='control e'  data-annotation-id={ann.id} />
          <div className='control w'  data-annotation-id={ann.id} />
          <div className='control sw' data-annotation-id={ann.id} />
          <div className='control s'  data-annotation-id={ann.id} />
          <div className='control se' data-annotation-id={ann.id} />
          </>
        }
        {
          selected && 
          <AnnotationActions annotation={annotation} viewNote={viewNote}/>
        }
      </div>;
    case 'highlight':
      let d = 'M ' + ann.position.points.map(
        ([x,y]) => (x*scale)+' '+(y*scale)
      ).join(' L ');
      return (<svg width='1' height='1'>
        <path d={d} stroke-width={scale+'em'}
          className={generateClassNames(classNames)}
          data-annotation-id={ann.id}
          id={'annotation'+ann.id}
          style={style}
        />
      </svg>);
      break;
    default:
      return null;
  }
}

function AnnotationActions(props) {
  const {
    annotation
  } = props;
  const context = useContext(pdfAnnotationPageContext);
  const cardInView = context.cardInView;
  const setSidebarVisible = context.sidebar.visible.set;

  const history = useHistory();
  const dispatch = useDispatch();
  const imageUrlRef= useRef(null);
  const imageUrl = process.env.REACT_APP_SERVER_ADDRESS+"/data/annotations/"+annotation.id+'/img';

  function deleteAnnotation() {
    dispatch(annotationActions['saveCheckpoint']());
    dispatch(annotationActions['deleteSingle'](annotation.id));
  }
  function createNote() {
    dispatch(annotationActions['saveCheckpoint']());
    dispatch(noteActions['create']({
      body: '# Note\nWrite your notes here',
      parser: 'markdown-it',
      annotation_id: annotation.id
    }));
    setSidebarVisible(true);
    qState.set(history, {tab: 'annotation_notes'});
  }
  function viewNote() {
    cardInView.setValue(annotation.note_id);
    setSidebarVisible(true);
    qState.set(history, {tab: 'annotation_notes'});
  }
  function copyPhotoUrlToClipboard() {
    if (!imageUrlRef.current) {
      return;
    }
    imageUrlRef.current.select();
    document.execCommand("copy");
  }

  return (
    <div className='actions-container'>
      {
        annotation.note_id ?
          <ButtonIcon onClick={viewNote}>
            <i className='material-icons'>description</i>
            <Tooltip>View Note</Tooltip>
          </ButtonIcon>
        : <ButtonIcon onClick={createNote}>
            <i className='material-icons'>note_add</i>
            <Tooltip>Create Note</Tooltip>
          </ButtonIcon>
      }
      <ButtonIcon onClick={deleteAnnotation}>
        <i className='material-icons'>delete</i>
        <Tooltip>Delete Note</Tooltip>
      </ButtonIcon>
      {
        annotation.type === 'rect' &&
        <GroupedInputs>
          <Input type='textfield' name='image-url' value={imageUrl}
            readOnly
            ref={imageUrlRef} />
          <ButtonIcon onClick={copyPhotoUrlToClipboard}>
            <i className='material-icons'>photo</i>
            <Tooltip>Copy Image URL</Tooltip>
          </ButtonIcon>
        </GroupedInputs>
      }
    </div>
  );
}

//////////////////////////////////////////////////
// Outline
//////////////////////////////////////////////////

function Outline(props) {
  const {
    outline,
  } = props;

  if (!outline) {
    return null;
  }
  return (
    <div className='outline'>
      <OutlineList outline={outline} />
    </div>
  );
}

function OutlineList(props) {
  const {
    outline,
  } = props;

  const history = useHistory();

  if (!outline) {
    return null;
  }
  return (
    <ul className='outline__list'>
      {
        outline.map(item => 
          <li key={item.dest}>
            <span className='outline__link' onClick={() => qState.set(history, {dest: item.dest})}>{item.title}</span>
            {
              item.items &&
              <OutlineList outline={item.items} />
            }
          </li>
        )
      }
    </ul>
  );
}

//////////////////////////////////////////////////
// Note Card
//////////////////////////////////////////////////

function NoteCard(props) {
  const {
    noteId,
    annotationId=null,
    isActive, setActive=()=>null,
  } = props;

  const localStorageId = 'note'+noteId;
  const dispatch = useDispatch();
  const history = useHistory();
  const updateNote = n => dispatch(noteActions['update'](n));
  const note = useSelector(
    state => noteId ? state.notes.entities[noteId] : null);
  // Stores changes before they're saved
  const [updatedNote,setUpdatedNote] = useState(null);
  const [isEditing,setIsEditing] = useState(false);
  const [isVisibleAdvancedOptions,setIsVisibleAdvancedOptions] = useState(false);
  const handleChange = formChangeHandler(updatedNote, x=>setUpdatedNote(x));

  function startEditing() {
    // Check if there's unsaved changes
    let data = window.localStorage.getItem(localStorageId);
    if (data) {
      data = JSON.parse(data);
      let message = 'Unsaved changes detected from '+data.date+'. Would you like to restore?'
      if (window.confirm(message)) {
        // Restore unsaved changes
        setUpdatedNote({
          ...note,
          body: data.body
        });
        setIsEditing(true);
        return;
      } else {
        // User decided not to restore unsaved changes
        window.localStorage.removeItem(localStorageId);
      }
    }
    // If there's no unsaved changes, or the user chose not to restore them, then load the note as is
    setUpdatedNote(note);
    setIsEditing(true);
  }
  function saveChanges() {
    updateNote(updatedNote);
    setUpdatedNote(null);
    setIsEditing(false);
    window.localStorage.removeItem(localStorageId);
  }
  function discardChanges() {
    setUpdatedNote(null);
    setIsEditing(false);
    window.localStorage.removeItem(localStorageId);
  }
  function deleteNote() {
    let c = window.confirm('Are you sure you want to delete this note?');
    if (c) {
      dispatch(noteActions['deleteSingle'](note.id));
      window.localStorage.removeItem(localStorageId);
    }
  }
  // Event Handlers
  function scrollIntoView() {
    // We need to update the state because if this is called twice in a row on the same annotation, it won't trigger a scroll because the URL search query does not change.
    qState.set(history, {
      annotation: annotationId,
      note: note.id
    });
  }
  function handleChangeBody(text) {
    setUpdatedNote({
      ...updatedNote,
      body: text
    });
    // Save changes to local storage
    let data = {
      body: text,
      date: new Date().toLocaleString()
    };
    window.localStorage.setItem(localStorageId, JSON.stringify(data));
  }

  const [key,setKey] = useState(0);
  function refresh() {
    // Force a rerender
    setKey(x => x+1);
  }

  if (!note) {
    return null;
  }
  if (note.deleted_at) {
    return null;
  }

  let classNames = generateClassNames({
    card: true,
    active: isActive
  });
  if (isEditing && updatedNote) {
    const options = {
      minimap: {
        enabled: false
      },
      lineNumbers: false,
    };
    return (<div className={classNames} key={key}
        onClick={()=>setActive(true)} id={'card'+note.id}>
      <TextEditor
          onChangeText={handleChangeBody}
          text={updatedNote.body}
          onSave={saveChanges}
          options={options}
          debounce={0}/>
      <div className='controls'>
        <GroupedInputs>
          <ButtonIcon onClick={saveChanges}>
            <i className='material-icons'>save</i>
          </ButtonIcon>
          <ButtonIcon onClick={discardChanges}>
            <i className='material-icons'>cancel</i>
          </ButtonIcon>
          <ButtonIcon onClick={deleteNote}>
            <i className='material-icons'>delete</i>
          </ButtonIcon>
        </GroupedInputs>
        {
          isVisibleAdvancedOptions ? (
            <div className='advanced'>
              <label>
                Parser:
                <select name='parser'
                    value={updatedNote.parser}
                    onChange={handleChange}>
                  <option value='plaintext'>plaintext</option>
                  <option value='commonmark'>commonmark</option>
                  <option value='markdown-it'>markdown-it</option>
                </select>
              </label>
              <div className='advanced-toggle' onClick={()=>setIsVisibleAdvancedOptions(false)}>Hide advanced Options</div>
            </div>
          ) : (
            <div className='advanced'>
              <div className='advanced-toggle' onClick={()=>setIsVisibleAdvancedOptions(true)}>Show advanced Options</div>
            </div>
          )
        }
      </div>
    </div>);
  } else {
    return (<div className={classNames} key={key}
        tabIndex={-1}
        onClick={()=>isActive?null:setActive(true)} id={'card'+note.id}>
      <NoteViewer note={note} />
      <div className='controls'>
        {
          annotationId &&
          <ButtonIcon onClick={scrollIntoView}>
            <i className='material-icons'>navigate_before</i>
            <Tooltip>View Annotation</Tooltip>
          </ButtonIcon>
        }
        <GroupedInputs>
          <ButtonIcon onClick={startEditing}>
            <i className='material-icons'>create</i>
            <Tooltip>Edit</Tooltip>
          </ButtonIcon>
          <ButtonIcon onClick={deleteNote}>
            <i className='material-icons'>delete</i>
            <Tooltip>Delete Note</Tooltip>
          </ButtonIcon>
          <ButtonIcon onClick={refresh}>
            <i className='material-icons'>sync</i>
            <Tooltip>Refresh</Tooltip>
          </ButtonIcon>
        </GroupedInputs>
        <ButtonIcon to={'/notes/'+note?.id}>
          <i className='material-icons'>open_in_new</i>
          <Tooltip>Open in editor</Tooltip>
        </ButtonIcon>
      </div>
    </div>);
  }
}

function NoteCardsContainer(props) {
  const {
    annotations,
  } = props;
  const context = useContext(pdfAnnotationPageContext);
  const activeId = context.activeId.val;
  const setActiveId = context.activeId.set;
  const cardInView = context.cardInView;
  const annotationInView = context.annotationInView;

  useEffect(()=>{
    if (!cardInView.changed) {
      return;
    }
    // If scrolling to an annotation, wait until it's in view
    if (annotationInView.changed) {
      return;
    }
    // Get DOM element and scroll to it
    let id = cardInView.value;
    let card = document.getElementById('card'+id);
    if (!card) {
      return;
    }
    card.scrollIntoView();
    cardInView.done();
  },[cardInView.changed, annotationInView.changed]);

  return (<div className='note-cards-container' >
    {
      Object.values(annotations).filter(
        ann => ann.note_id
      ).map(function(ann){
        return (
          <NoteCard
              key={ann.note_id}
              noteId={ann.note_id}
              annotationId={ann.id}
              isActive={ann.id === activeId}
              setActive={(f)=>setActiveId(f ? ann.id : null)} />
        );
      })
    }
  </div>)
}

//////////////////////////////////////////////////
// Side Bar
//////////////////////////////////////////////////

function DocInfoForm(props) {
  const {
    doc,
    updateDoc
  } = props;
  const handleChange = formChangeHandler(doc, x=>updateDoc(doc.id,x));

  if (!doc) {
    return null;
  }

  return (<div className='doc-info-form'>
    <LabelledInput type='textfield' label='Title' name='title' placeholder='(Untitled)' value={doc['title'] || ''} onChange={handleChange} />
    <LabelledInput type='textfield' label='Authors' name='author' placeholder='Anonymous' value={doc['author'] || ''} onChange={handleChange} />
    <LabelledInput type='textfield' label='URL' name='url' placeholder='https://...' value={doc['url'] || ''} onChange={handleChange} />
    <LabelledTextArea name='bibtex' label='Bibtex' value={doc['bibtex'] || ''} onChange={handleChange} />
    <div>
      <LabelledCheckbox name='read' checked={doc['read']} onChange={handleChange}>
      Read
      </LabelledCheckbox>
    </div>
  </div>);
}

function DocNotes(props) {
  const {
    doc,
  } = props;
  const dispatch = useDispatch();

  const note = useSelector(
    state => doc.note_id ? state.notes.entities[doc.note_id] : null
  );

  function handleCreateNote(e) {
    dispatch(noteActions['create']({
      'document_id': doc.id,
      'body': '# '+ (doc.title || 'Note'),
      'parser': 'markdown-it',
    }));
  }
  function updateAnnotation(ann) {
    dispatch(annotationActions['saveCheckpoint']());
    dispatch(annotationActions['update'](ann));
  }

  return (<div className='doc-notes-container'>
    {
      !doc.note_id &&
      <Button onClick={handleCreateNote}>
        Create Note
      </Button>
    }
    {
      doc.note_id &&
      <NoteCard
        key={note.id}
        noteId={note.id}
        isActive={false}
        updateAnnotation={updateAnnotation}
      />
    }
  </div>);
}

function SideBar(props) {
  const {
    tabs = [],
  } = props;
  const context = useContext(pdfAnnotationPageContext);
  const visible = context.sidebar.visible.val;
  const onChangeVisible = context.sidebar.visible.set;
  const activeTabId = context.sidebar.activeTabId.val;

  const history = useHistory();
  const setActiveTabId = id => qState.replace(history, {...qState.get(history), tab: id});

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      let tabId = e.target.getAttribute('data-tab-id');
      setActiveTabId(tabId);
      e.preventDefault();
    }
  }

  let classNames = generateClassNames({
    'sidebar': true,
    'hidden': !visible
  })
  const activeTabIndex = tabs.map(t => t.id).indexOf(activeTabId);
  const activeTab = tabs[activeTabIndex];
  return (<div className={classNames}>
    <div className='controls' onClick={()=>onChangeVisible(!visible)}>
    {
      visible
        ? <i className='material-icons'>navigate_next</i>
        : <i className='material-icons'>navigate_before</i> 
    }
    </div>
    <GroupedInputs className='tab-container'>
      {
        tabs.map((tab,i) => {
          let classNames = generateClassNames({
            'tab': true,
            'active': activeTabId === tab.id
          });
          return (<Button key={tab.title}
              data-tab-id={tab.id}
              className={classNames}
              tabIndex={0}
              onKeyDown={e=>handleKeyDown(e,i)}
              onClick={()=>setActiveTabId(tab.id)}>
            {tab.title}
          </Button>);
        })
      }
    </GroupedInputs>
    {activeTab.render()}
  </div>);
}

//////////////////////////////////////////////////
// Toolbar
//////////////////////////////////////////////////

function PageSelector(props) {
  const {
    totalPages, // Total number of pages
    pageNumber, // Actual page number
    onPageNumberChange // Callback if user selects a different page
  } = props;
  const [displayPage, setDisplayPage] = useState(1); // Page number to display

  useEffect(() => {
    setDisplayPage(pageNumber);
  }, [pageNumber]);

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      onPageNumberChange(displayPage);
    }
  }

  return (
    <div className='page-selector'>
      <Input type='textfield' value={displayPage}
        onChange={e => setDisplayPage(e.target.value)}
        onKeyDown={handleKeyDown} />
      <span>/{totalPages}</span>
    </div>
  );
}

//////////////////////////////////////////////////
// Full Page
//////////////////////////////////////////////////

export default function PdfAnnotationPage(props) {
  const {
    docId
  } = useParams();
  const dispatch = useDispatch();
  const location = useLocation();
  const doc = useSelector(state => state.documents.entities[docId]);

  const pdfViewerState = usePdfViewerState(
    doc,
    {
      onScroll: handlePdfScroll,
    }
  );

  const annotations = useSelector(
    useCallback(createSelector(
      state => state.annotations.entities,
      annotations => filterDict(
        annotations,
        ann => !ann.deleted_at && ann.doc_id === parseInt(docId)
      )
    ),[docId])
  );
  const annotationsByPage = useMemo(() => { 
    return Object.values(annotations).reduce((acc,ann) => {
      if (!ann) { return acc; }
      const p = parseInt(ann.page);
      if (!acc[p]) {
        acc[p] = {};
      }
      acc[p][ann.id] = ann;
      return acc;
    }, {});
  }, [annotations]);
  const [activeId, setActiveId] = useState(null);
  const cardInView = useSemiState(null,false);
  const annotationInView = useSemiState(null,false);
  const [toolState, setToolState] = useState(null);
  const [toolStateStack, setToolStateStack] = useState([]);
  const [sidebarActiveTabId, setSidebarActiveTabId] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Outline
  const [outline, setOutline] = useState(null);
  useEffect(() => {
    pdfViewerState.pdf?.getOutline().then(
      o => {
        setOutline(o);
        window.outline = o;
        window.scrollToDest = pdfViewerState.scrollToDest;
      }
    );
  }, [pdfViewerState.pdf]);

  // Process History change
  const history = useHistory();
  const [locationKeys, setLocationKeys] = useState([]);
  useEffect(() => {
    // See https://stackoverflow.com/a/60125216
    const unlisten = history.listen(location => {
      if (history.action === 'PUSH') {
        setLocationKeys([location.key]);
        // Handle push
        handleHistoryPush(location);
      } else if (history.action === 'POP') {
        if (locationKeys[1] === location.key) {
          setLocationKeys(([ _, ...keys ]) => keys);
          // Handle forward event
          handleHistoryForward(location);
        } else {
          setLocationKeys((keys) => [ location.key, ...keys ]);
          // Handle back event
          handleHistoryBack(location);
        }
      } else if (history.action === 'REPLACE') {
        handleHistoryReplace(location);
      }
    });
    return unlisten;
  }, [locationKeys]);
  function handleHistoryPush(location) {
    let params = parseQueryString(location.search);
    if (params['annotation']) {
      let id = parseInt(params['annotation']);
      setActiveId(id);
      annotationInView.setValue(id);
    }
    if (params['note']) {
      let id = parseInt(params['note']);
      cardInView.setValue(id);
    }
    if (params['tab']) {
      let id = params['tab'];
      setSidebarActiveTabId(id);
      setSidebarVisible(true);
    }
    if (params['page']) {
      let page = params['page'];
      pdfViewerState.scrollToPage(page);
      scrolledSinceJump.current = -1;
    }
    if (params['dest']) {
      let dest = params['dest'];
      pdfViewerState.scrollToDest(dest);
      scrolledSinceJump.current = -1;
    }
    if (params['y']) {
      let scale = pdfViewerState.scale;
      pdfViewerState.scrollTo({y: parseFloat(params['y'])*scale});
    }
  }
  function handleHistoryBack(location) {
    let params = parseQueryString(location.search);
    if (params['annotation']) {
      let id = parseInt(params['annotation']);
      setActiveId(id);
      annotationInView.setValue(id);
    }
    if (params['note']) {
      let id = parseInt(params['note']);
      cardInView.setValue(id);
    }
    if (params['tab']) {
      // Ignore
    }
    if (params['page']) {
      let page = params['page'];
      pdfViewerState.scrollToPage(page);
      scrolledSinceJump.current = -1;
    }
    if (params['dest']) {
      let dest = params['dest'];
      pdfViewerState.scrollToDest(dest);
      scrolledSinceJump.current = -1;
    }
    if (params['y']) {
      let scale = pdfViewerState.scale;
      pdfViewerState.scrollTo({y: parseFloat(params['y'])*scale});
    }
  }
  function handleHistoryForward(location) {
    handleHistoryBack(location);
  }
  function handleHistoryReplace(location) {
    let params = parseQueryString(location.search);
    if (params['tab']) {
      let id = params['tab'];
      setSidebarActiveTabId(id);
      setSidebarVisible(true);
    }
  }

  // Scroll Position
  useEffect(() => { // Scroll annotation into view
    if (!annotationInView.changed) {
      return;
    }
    let ann = annotations[annotationInView.value];
    if (ann) {
      let pageNum = ann.page;
      let pageIndex = parseInt(pageNum)-1;
      pdfViewerState.scrollToPage(pageIndex);
      annotationInView.done();
    }
  }, [annotationInView.changed, annotations]);
  useEffect(() => { // Scroll note card into view
    function scrollWhenFound() {
      if (!cardInView.changed) {
        return;
      }
      let cardElemId = 'card'+cardInView.value;
      let elem = document.getElementById(cardElemId);
      if (!elem) { // Try again later
        window.setTimeout(scrollWhenFound, 100);
        return;
      }
      elem.scrollIntoView();
      cardInView.done();
    }
    setSidebarActiveTabId('annotation_notes');
    scrollWhenFound();
  }, [cardInView.changed]);

  // Document title
  useEffect(() => {
    if (!doc) {
      document.title = 'PDF Annotator Tool';
    } else {
      document.title = doc.title || doc.url || 'PDF Annotator Tool';
    }
  },[doc]);

  // Load PDF URL and annotations
  useEffect(()=>{
    if (!docId) {
      return;
    }
    // Fetch document and all associated entities (annotations, notes)
    dispatch(documentActions['fetchSingle'](docId,'recursive'));
  },[docId]);

  // Visible pages
  function scrollToPage(pageNum) {
    pdfViewerState.scrollToPage(pageNum-1);
  }

  // CRUD Functions
  function createAnnotation(ann) {
    dispatch(annotationActions['saveCheckpoint']());
    ann['doc_id'] = docId;
    dispatch(annotationActions['create'](ann)).then(response => {
      let newAnnotations = response.data.entities.annotations;
      let newAnnotationId = Object.keys(newAnnotations)[0];
      setActiveId(parseInt(newAnnotationId));
    },0);
  }
  function updateAnnotation(ann) {
    dispatch(annotationActions['saveCheckpoint']());
    dispatch(annotationActions['update'](ann));
  }
  function deleteAnnotation(id) { dispatch(annotationActions['saveCheckpoint']());
    dispatch(annotationActions['deleteSingle'](id));
  }
  function updateDoc(id, doc) {
    dispatch(documentActions['saveCheckpoint']());
    dispatch(documentActions['update'](doc));
  }

  // Tools
  function handleDoubleClickAnnotation({event,data}) {
    switch (data.ann.type) {
      case 'highlight':
      case 'rect':
      case 'point':
        let newState = tools['resize'].initState();
        newState.selectedAnnotationId = data.ann.id;
        newState.tempPosition = data.ann.position;
        pushTool(newState);
        break;
      default:
        break;
    }
  }
  function handleClickAnnotation({event,data}) {
    setActiveId(data.ann.id);
    cardInView.setValue(data.ann.note_id);
  }
  const tools = useMemo( () => {
    return {
      read: {
        initState: function() {
          return {
            type: 'read'
          };
        },
        eventHandlers: {
          pdf: {
            onClick: function({event,data}) {
              setActiveId(null);
              popTool();
            }
          },
          annotation: {
            onClick: function({event,data}) {
              setActiveId(data.id);
              cardInView.setValue(annotations[data.id].note_id);
            },
            onDoubleClick: handleDoubleClickAnnotation,
            onClick: handleClickAnnotation,
          }
        }
      },
      text: {
        initState: function() {
          return {
            type: 'text'
          };
        },
        eventHandlers: {
          pdf: {},
          annotation: {},
        }
      },
      resize: {
        initState: function() {
          return {
            type: 'resize',
            // ID of the selected annotation
            selectedAnnotationId: null,
            // If the selected annotation is changed (e.g. moved, resized, etc),
            // then the intermediate annotation is stored here before it's
            // updated in the store.
            tempPosition: null,
            // Type of action being performed from a click and drag.
            // Possible values: move, resize-n, resize-ne, resize-nw, etc.
            dragAction: null,
            dragStartCoord: null,
            pageBoundaries: null
          };
        },
        eventHandlers: {
          // Handles events on the PDF document body
          pdf: {
            onClick: function({toolState, setToolState}) {
              if (toolState.dragAction) {
                // This happens if the mouse was dragged out of the screen,
                // then released, and moved back in. We want to continue the
                // dragging action.
                return;
              } else {
                setToolState({
                  ...toolState,
                  selectedAnnotationId: null
                });
                popTool();
              }
            },
            onMouseDown: function() {},
            onMouseMove: function() {},
          },
          // Handles events on the annotation
          annotation: {
            onClick: function({event, data, toolState, setToolState}) {
              if (toolState.dragAction) {
                // This happens if the mouse was dragged out of the screen,
                // then released, and moved back in. We want to continue the
                // dragging action.
                return;
              } else {
                setActiveId(data.ann.id);
                cardInView.setValue(data.ann.note_id);
                setToolState({
                  ...toolState,
                  selectedAnnotationId: data.ann.id,
                  tempPosition: null,
                });
              }
            },
            onMouseDown: function({event, data, toolState, setToolState}) {
              if (toolState.dragAction) {
                // This happens if the mouse was dragged out of the screen,
                // then released, and moved back in. We want to continue the
                // dragging action.
                return;
              } else {
                // Start moving annotation if appropriate
                const classNames = getClassNames(event.target);
                // Only move if the user selected it first
                if (classNames.indexOf('selected') !== -1) {
                  const selId = toolState.selectedAnnotationId;
                  setToolState({
                    ...toolState,
                    dragAction: 'move',
                    tempPosition: annotations[selId].position
                  });
                }
              }
            },
          },
          // Handles events on the annotation's control points
          controlPoint: {
            onMouseDown: function({event, data, toolState, setToolState}) {
              if (toolState.dragAction) {
                // This happens if the mouse was dragged out of the screen,
                // then released, and moved back in. We want to continue the
                // dragging action.
                return;
              } else {
                // Start resizing if appropriate
                const classNames = getClassNames(event.target);
                const directions = ['nw','n','ne','w','e','sw','s','se'];
                for (let d of directions) {
                  if (classNames.indexOf(d) !== -1) {
                    setToolState({
                      ...toolState,
                      dragAction: 'resize-'+d,
                      dragStartCoord: data.coords
                    });
                    break;
                  }
                }
              }
            },
          },
          // Handle mouse movement and mouse up over anything
          onMouseMove: function({event, data, toolState, setToolState}) {
            const { coords, startMouseCoord } = data;
            if (toolState.selectedAnnotationId === null) {
              return;
            }
            if (!toolState.dragAction) {
              return;
            }
            const deltaX = coords[0]-startMouseCoord[0];
            const deltaY = coords[1]-startMouseCoord[1];
            const selId = toolState.selectedAnnotationId;
            const pageIndex = annotations[selId].page-1
            const vp = pdfViewerState.pages[pageIndex].getViewport({scale:1});
            if (toolState.dragAction === 'move') {
              const selType = annotations[selId].type;
              const pos = annotations[selId].position;
              switch (selType) {
                case 'point':
                  // Update temp annotation
                  setToolState({
                    ...toolState,
                    tempPosition: {
                      coords: [
                        clip(pos.coords[0]+deltaX,0,vp.width),
                        clip(pos.coords[1]+deltaY,0,vp.height)
                      ]
                    }
                  });
                  break;
                case 'rect':
                  const w = pos.box[1]-pos.box[3];
                  const h = pos.box[2]-pos.box[0];
                  setToolState({
                    ...toolState,
                    tempPosition: {
                      box: [
                        clip(pos.box[0]+deltaY,0,vp.height-h),
                        clip(pos.box[1]+deltaX,w,vp.width),
                        clip(pos.box[2]+deltaY,h,vp.height),
                        clip(pos.box[3]+deltaX,0,vp.width-w)
                      ]
                    }
                  });
                  break;
                default:
                  break;
              }
            } else if (toolState.dragAction.startsWith('resize-')) {
              let action = toolState.dragAction.substr('resize-'.length);
              let resizableDirs = {
                left: action.indexOf('w') !== -1,
                right: action.indexOf('e') !== -1,
                top: action.indexOf('n') !== -1,
                bottom: action.indexOf('s') !== -1,
              };
              let box = [...annotations[selId].position.box];
              if (resizableDirs.left) {
                box[3] += deltaX;
              }
              if (resizableDirs.right) {
                box[1] += deltaX;
              }
              if (resizableDirs.top) {
                box[0] += deltaY;
              }
              if (resizableDirs.bottom) {
                box[2] += deltaY;
              }
              setToolState({
                ...toolState,
                tempPosition: {
                  box: box
                }
              });
            }
          },
          onMouseUp: function({event, data, toolState, setToolState}) {
            const selId = toolState.selectedAnnotationId;
            if (selId !== null && annotations[selId] && toolState.tempPosition) {
              updateAnnotation({
                ...annotations[selId],
                position: toolState.tempPosition
              });
              setToolState({
                ...toolState,
                dragAction: null,
                tempPosition: null
              });
            }
            setToolState({
              ...toolState,
              dragAction: null
            });
          },
          onKeyDown: function({event, data, toolState, setToolState}) {
            if (event.key === 'Delete') {
              const selId = toolState.selectedAnnotationId;
              deleteAnnotation(selId);
              setToolState({
                ...toolState,
                selectedAnnotationId: null,
                tempPosition: null
              });
            }
          },
        },
      },
      point: {
        initState: function() {
          return {
            type: 'point',
          };
        },
        eventHandlers: {
          pdf: {
            onClick: function({event, data}) {
              createAnnotation({
                type: 'point',
                position: {
                  coords: data.coords,
                },
                page: data.page
              });
              popTool();
            }
          },
          annotation: {
            onDoubleClick: handleDoubleClickAnnotation,
            onClick: handleClickAnnotation,
          },
          controlPoint: {
          },
        }
      },
      rect: {
        initState: function() {
          return {
            type: 'rect',
            // Store temporarily created annotation as the user is creating
            // it by dragging the mouse.
            tempAnnotation: null,
            dragStartCoord: null
          };
        },
        eventHandlers: {
          pdf: {
            onClick: function({toolState}) {
              if (toolState.tempAnnotation) {
                // Continue creating the annotation
                return
              } else {
                popTool();
              }
            },
            onMouseDown: function({event, data, toolState, setToolState}) {
              if (toolState.tempAnnotation) {
                // Continue creating the annotation
                return
              } else {
                setToolState({
                  ...toolState,
                  dragStartCoord: data.coords
                });
              }
            },
          },
          annotation: {
            onDoubleClick: handleDoubleClickAnnotation,
            onClick: handleClickAnnotation,
            onMouseDown: function({event, data, toolState, setToolState}) {
              if (toolState.tempAnnotation) {
                // Continue creating the annotation
                return
              } else {
                setToolState({
                  ...toolState,
                  dragStartCoord: data.coords
                });
              }
            },
          },
          controlPoint: {
          },
          onMouseMove: function({event, data, toolState, setToolState}) {
            const {coords} = data;
            const startMouseCoord = toolState.dragStartCoord;
            const left   = Math.min(coords[0],startMouseCoord[0]);
            const right  = Math.max(coords[0],startMouseCoord[0]);
            const top    = Math.min(coords[1],startMouseCoord[1]);
            const bottom = Math.max(coords[1],startMouseCoord[1]);
            setToolState({
              ...toolState,
              tempAnnotation: {
                id: 'temp',
                type: 'rect',
                position: {
                  box: [top,right,bottom,left]
                }
              }
            });
          },
          onMouseUp: function({event, data, toolState, setToolState}) {
            const {coords} = data;
            const startMouseCoord = toolState.dragStartCoord;
            if (!startMouseCoord || !coords) {
              return; // Starting coords is none if mousedown happened elsewhere
            }
            const left   = Math.min(coords[0],startMouseCoord[0]);
            const right  = Math.max(coords[0],startMouseCoord[0]);
            const top    = Math.min(coords[1],startMouseCoord[1]);
            const bottom = Math.max(coords[1],startMouseCoord[1]);
            // Don't create a size 0 rectangle
            if (left !== right && top !== bottom) {
              createAnnotation({
                type: 'rect',
                position: {
                  box: [top,right,bottom,left],
                },
                page: data.page
              });
            }
            setToolState({
              ...toolState,
              tempAnnotation: null,
              dragStartCoord: null
            })
          },
        }
      },
      highlight: {
        initState: function() {
          return {
            type: 'highlight',
            points: null, // Sequence of mouse move coordinates
            keepStraight: false, // Straight line from the initial click to current mouse position
          };
        },
        eventHandlers: {
          pdf: {
            onClick: function({toolState, setToolState}) {
              if (toolState.points) {
                // Continue creating the annotation
                return
              } else {
                popTool();
              }
            },
            onMouseDown: function({event, data, toolState, setToolState}) {
              if (toolState.points) {
                // Continue creating the annotation
                return
              } else {
                setToolState({
                  ...toolState,
                  points: [data.coords],
                  tempAnnotation: {
                    id: 'temp',
                    type: 'highlight',
                    position: {
                      points: [data.coords]
                    }
                  }
                })
              }
            },
          },
          annotation: {
            onDoubleClick: handleDoubleClickAnnotation,
            onClick: handleClickAnnotation,
          },
          controlPoint: {},
          onMouseMove: function({event, data, toolState, setToolState}) {
            const {coords} = data;
            if (toolState.points) {
              setToolState({
                ...toolState,
                points: [...toolState.points, coords],
                keepStraight: event.ctrlKey,
                tempAnnotation: {
                  id: 'temp',
                  type: 'highlight',
                  position: {
                    points: event.ctrlKey
                      ? [toolState.points[0], coords]
                      : [...toolState.points, coords]
                  }
                }
              });
            }
          },
          onMouseUp: function({event, data, toolState, setToolState}) {
            if (toolState.points) {
              // Check if there's enough points.
              let minX = toolState.points[0][0];
              let minY = toolState.points[0][1];
              let maxX = toolState.points[0][0];
              let maxY = toolState.points[0][1];
              for (let p of toolState.points) {
                if (p[0] < minX) { minX = p[0]; }
                if (p[0] > maxX) { maxX = p[0]; }
                if (p[1] < minY) { minY = p[1]; }
                if (p[1] > maxY) { maxY = p[1]; }
              }
              if (maxX-minX < 5 && maxY-minY < 5) {
                // Too small. User probably didn't intend to create a marking.
                // Ignore
              } else {
                createAnnotation({
                  type: 'highlight',
                  position: toolState.tempAnnotation.position,
                  page: data.page
                });
              }
            }
            setToolState({
              ...toolState,
              points: null,
              tempAnnotation: null,
            })
          },
        }
      },
    }
  }, [annotations]);
  useEffect(() => { // Add keyboard event listener
    if (!toolState) {
      return;
    }
    const eventHandlers = tools[toolState.type].eventHandlers;
    if (!eventHandlers.onKeyDown) {
      return;
    }
    function callback(event) {
      const data = {};
      eventHandlers.onKeyDown({
        event, data, toolState, setToolState
      });
    }
    document.addEventListener('keydown',callback);
    return () => {
      document.removeEventListener('keydown',callback);
    }
  }, [tools,toolState]);

  // Initialize State
  useEffect(() => {
    setToolState(tools.read.initState());
  }, []);

  // Scrolling
  const scrolledSinceJump = useRef(0); // >0 = the user has scrolled since the last position jump (e.g. clicking a link).
  function scrollToNextPage(e) {
    // TODO
  }
  function scrollToPrevPage(e) {
    // TODO
  }
  function handlePdfScroll(e) {
    //scrolledSinceJump.current += 1;
    //if (scrolledSinceJump.current > 0) {
    //  if (scrolledSinceJump.current === 1) {
    //    // Push history
    //    qState.set(history, {
    //      y: e.target.scrollTop/pdfViewerState.scale,
    //      x: e.target.scrollLeft/pdfViewerState.scale,
    //    });
    //  } else {
    //    // Replace history
    //    qState.replace(history, {
    //      y: e.target.scrollTop/pdfViewerState.scale,
    //      x: e.target.scrollLeft/pdfViewerState.scale,
    //    });
    //  }
    //}
  }

  // Misc
  function activateAnnotation(annId) {
    setActiveId(annId);
    if (annId) { // Check if we're activating or deactivating
      cardInView.setValue(annotations[annId].note_id);
      setToolState({
        ...tools.resize.initState(),
        selectedAnnotationId: annId,
        tempPosition: annotations[annId].position
      });
    }
  }
  function zoomIn() {
    pdfViewerState.setScale(Math.min(pdfViewerState.scale+0.2,3));
  }
  function zoomOut() {
    pdfViewerState.setScale(Math.max(pdfViewerState.scale-0.2,1));
  }
  function pushTool(newState) {
    setToolStateStack([...toolStateStack, toolState]);
    setToolState(newState);
  }
  function popTool() {
    if (toolStateStack.length === 0) {
      return;
    }
    let newStack = toolStateStack.slice(0,-1);
    let poppedState = toolStateStack.slice(-1)[0];
    setToolStateStack(newStack);
    setToolState(poppedState);
  }
  function selectTool(toolType) {
    let newState = tools[toolType].initState();
    setToolStateStack([]);
    setToolState(newState);
  }
  function handleKeyDown(event) { // Undo/Redo Key bindings
    if (event.ctrlKey) {
      if (event.key === 'z') {
        dispatch(annotationActions['undo']());
      } else if (event.key === 'y') {
        dispatch(annotationActions['redo']());
      }
    } else {
      if (event.target.tagName !== 'INPUT' && 
          event.target.tagName !== 'TEXTAREA') {
        // Only scroll when not in a text field/area
        if (event.key === 'ArrowRight') {
          scrollToNextPage(event);
          event.preventDefault();
        } else if (event.key === 'ArrowLeft') {
          scrollToPrevPage(event);
          event.preventDefault();
        }
      }
    }
  }
  useEffect(() => { // Add keyboard event listener
    document.addEventListener('keydown',handleKeyDown);
    return () => {
      document.removeEventListener('keydown',handleKeyDown);
    }
  })

  const tabs = useMemo(() => [
    {
      id: 'details',
      title: 'Details',
      render: () => <DocInfoForm doc={doc} updateDoc={updateDoc} />
    },{
      id: 'outline',
      title: 'Outline',
      render: () => <Outline outline={outline} />
    },{
      id: 'annotation_notes',
      title: 'Annotation Notes',
      render: () => 
        <NoteCardsContainer
            annotations={annotations} />
    },{
      id: 'notes',
      title: 'Notes',
      render: () => <DocNotes doc={doc} />
    }
  ], [doc, annotations, outline]);

  // Context
  const context = useMemo( () => { 
    return {
      'activeId': {val: activeId, set: activateAnnotation}, // TODO: Check if this works with `setActiveId` and a useEffect hook for the side-effects
      'cardInView': cardInView,
      'annotationInView': annotationInView,
      'sidebar': {
        'visible': {val: sidebarVisible, set: setSidebarVisible},
        'activeTabId': {
          val: sidebarActiveTabId, 
        }
      },
    }
  }, [doc, activeId, cardInView.changed, annotationInView.changed, toolState, sidebarVisible, sidebarActiveTabId]);

  const renderCustomLayers = useCallback(({page, scale}) => {
    return <AnnotationLayer
      annotations={annotationsByPage[page._pageIndex+1] || {}}
      eventHandlers={tools[toolState.type].eventHandlers}
      page={page}
      pageNum={page._pageIndex+1}
      scale={scale}
      activeId={activeId}
      cardInView={cardInView}
      toolState={toolState}
      setToolState={setToolState}
    />;
  }, [annotationsByPage, toolState]);

  // Can't render until everything is initialized
  if (toolState === null) {
    return null;
  }
  return (<main className='annotation-page'>
    <pdfAnnotationPageContext.Provider value={context}>
      <PdfViewer state={pdfViewerState} customLayers={renderCustomLayers} textLayerOnTop={toolState.type === 'text'} tabIndex={-1} />
      <div className='sidebar-container'>
        <SideBar tabs={tabs} />
      </div>
      <div className='controls'>
        <GroupedInputs>
          <Button onClick={()=>selectTool('read')} className={toolState.type === 'read' ? 'active' : null}>
            Read
          </Button>
          <Button onClick={()=>selectTool('text')} className={toolState.type === 'text' ? 'active' : null}>
            Text
          </Button>
          <Button onClick={()=>selectTool('resize')} className={toolState.type === 'resize' ? 'active' : null}>
            Resize
          </Button>
          <Button onClick={()=>selectTool('point')} className={toolState.type === 'point' ? 'active' : null}>
            Point
          </Button>
          <Button onClick={()=>selectTool('rect')} className={toolState.type === 'rect' ? 'active' : null}>
            Rect
          </Button>
          <Button onClick={()=>selectTool('highlight')} className={toolState.type === 'highlight' ? 'active' : null}>
            Highlight
          </Button>
        </GroupedInputs>
        <GroupedInputs>
          <ButtonIcon onClick={zoomIn}>
            <i className='material-icons'>zoom_in</i>
            <Tooltip>Zoom in</Tooltip>
          </ButtonIcon>
          <ButtonIcon onClick={zoomOut}>
            <i className='material-icons'>zoom_out</i>
            <Tooltip>Zoom out</Tooltip>
          </ButtonIcon>
        </GroupedInputs>
        <GroupedInputs>
          <ButtonIcon onClick={()=>dispatch(annotationActions['undo']())}>
            <i className='material-icons'>undo</i>
            <Tooltip>Undo</Tooltip>
          </ButtonIcon>
          <ButtonIcon onClick={()=>dispatch(annotationActions['redo']())}>
            <i className='material-icons'>redo</i>
            <Tooltip>Redo</Tooltip>
          </ButtonIcon>
        </GroupedInputs>
        {
          <PageSelector pageNumber={pdfViewerState.visiblePageRange[0]+1}
            totalPages={pdfViewerState.pdf?.numPages}
            onPageNumberChange={scrollToPage} />
        }
      </div>
    </pdfAnnotationPageContext.Provider>
  </main>);
}
