import React from 'react';
import { useEffect, useState, useRef } from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { useParams } from "react-router-dom";
import * as commonmark from 'commonmark';

import {clip,filterDict,generateClassNames,formChangeHandler} from './Utils.js';
import {documentActions,annotationActions} from './actions/index.js';

import './PdfViewer.scss';

//////////////////////////////////////////////////
// Annotations
//////////////////////////////////////////////////

function AnnotationLayer(props) {
  const {
    createAnnotation,
    updateAnnotation,
    annotations,
    eventHandlers,
    toolState,
    page,
    scale
  } = props;

  const ref = useRef(null);

  const [startMouseCoord,setStartMouseCoord] = useState(null);
  const [mouseCoord,setMouseCoord] = useState(null);
  const [mouseMoved,setMouseMoved] = useState(false);

  // Event Handlers
  function getCoordsFromEvent(event) {
    // Ensure that the coordinates are relative to the correct element
    const rect = ref.current.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left)/scale;
    const offsetY = (event.clientY - rect.top)/scale;
    return [offsetX,offsetY];
  }
  function onClick(event) {
    const coords = getCoordsFromEvent(event);
    const data = {
      page,
      coords
    };
    // Clicked on PDF
    if (event.target === ref.current) {
      let callback = eventHandlers.pdf.onClick;
      if (callback) {
        callback(event, data);
      }
    } else {
      // TODO
    }
  }
  function onDoubleClick(event,ann) {
    const coords = getCoordsFromEvent(event);
    const data = {
      page,
      coords,
      ann
    };

    const classNames = event.target.className.split(' ');
    let callback = null;
    if (event.target === ref.current) {
      callback = eventHandlers.pdf.onDoubleClick;
    } else if (classNames.indexOf('annotation') !== -1) {
      callback = eventHandlers.annotation.onDoubleClick;
    } else if (classNames.indexOf('control') !== -1) {
      callback = eventHandlers.controlPoint.onDoubleClick;
    }
    if (callback) {
      callback(event, data);
    }
  }
  function onMouseDown(event) {
    const coords = getCoordsFromEvent(event);
    setStartMouseCoord(coords);
    const data = {
      page,
      coords
    };

    const classNames = event.target.className.split(' ');
    let callback = null;
    if (event.target === ref.current) {
      callback = eventHandlers.pdf.onMouseDown;
    } else if (classNames.indexOf('annotation') !== -1) {
      callback = eventHandlers.annotation.onMouseDown;
    } else if (classNames.indexOf('control') !== -1) {
      callback = eventHandlers.controlPoint.onMouseDown;
    }
    if (callback) {
      callback(event, data);
    }
  }
  function onMouseUp(event) {
    const coords = getCoordsFromEvent(event);
    const data = {
      page,
      coords,
      mouseMoved,
      startMouseCoord
    };
    if (mouseMoved) {
      let callback = eventHandlers.onMouseUp;
      if (callback) {
        callback(event, data);
      }
    }
    setStartMouseCoord(null);
    setMouseMoved(false);
  }
  function onMouseMove(event) {
    const coords = getCoordsFromEvent(event);
    setMouseMoved(true);
    if (!startMouseCoord) {
      return;
    }
    const data = {
      page,
      coords,
      startMouseCoord,
    };
    let callback = eventHandlers.onMouseMove;
    if (callback) {
      callback(event, data);
    }
  }
  function onKeyPress(event) {
    const classNames = event.target.className.split(' ');
    const data = {
      page,
    };
    // Target = pdf document
    if (event.target === ref.current) {
      let callback = eventHandlers.pdf.onKeyPress;
      if (callback) {
        callback(event, data);
      }
    } else if (classNames.indexOf('annotation') !== -1) {
      // Handled by Annotation DOM
    } else if (classNames.indexOf('control') !== -1) {
      let callback = eventHandlers.controlPoint.onKeyPress;
      if (callback) {
        callback(event, data);
      }
    }
  }

  // Rendering
  function renderAnnotation(ann) {
    const key = ann.id;
    let style = null;
    let classNames = ['annotation'];
    let selected = false;
    if (key === toolState.selectedAnnotationId) {
      classNames.push('selected');
      selected = true;
      ann = {
        ...ann,
        position: toolState.tempPosition || ann.position
      }
    }
    function onClick(event) {
      if (key === 'temp') {
        return;
      }
      let callback = eventHandlers.annotation.onClick;
      if (callback) {
        callback(event, {id: key});
      }
    }
    function onKeyPress(event) {
      if (key === 'temp') {
        return;
      }
      let data = {
        id: key,
        page
      }
      let callback = eventHandlers.annotation.onKeyPress;
      if (callback) {
        callback(event, data);
      }
    }
    switch (ann.type) {
      case 'point':
        style = {
          left: ann.position.coords[0]*scale,
          top: ann.position.coords[1]*scale,
        };
        classNames.push('point');
        return <div className={classNames.join(' ')}
          tabIndex={-1}
          key={key}
          style={style}
          onClick={onClick}
          onKeyPress={onKeyPress}
          onDoubleClick={e => onDoubleClick(e,ann)}>
        </div>;
      case 'rect':
        style = {
          top: ann.position.box[0]*scale,
          left: ann.position.box[3]*scale,
          height: (ann.position.box[2]-ann.position.box[0])*scale,
          width: (ann.position.box[1]-ann.position.box[3])*scale,
        };
        classNames.push('rect');
        return <div className={classNames.join(' ')}
          tabIndex={-1}
          key={key}
          style={style}
          onClick={onClick}
          onKeyPress={onKeyPress}
          onDoubleClick={e => onDoubleClick(e,ann)}>
          {
            selected &&
            <>
            <div className='control nw' />
            <div className='control n' />
            <div className='control ne' />
            <div className='control e' />
            <div className='control w' />
            <div className='control sw' />
            <div className='control s' />
            <div className='control se' />
            </>
          }
        </div>;
    }
  }

  return <div className='annotation-layer'
      tabIndex={-1}
      ref={ref}
      onClick={onClick} onMouseDown={onMouseDown}
      onMouseUp={onMouseUp} onMouseMove={onMouseMove}
      onKeyDown={onKeyPress}>
    {
      Object.values(annotations).map(renderAnnotation)
    }
    { toolState.tempAnnotation && renderAnnotation(toolState.tempAnnotation) }
  </div>;
}

function AnnotationTextCard(props) {
  const {
    annotation,
    isActive, setActive,
    updateAnnotation,
    scale
  } = props;
  const dispatch = useDispatch();
  // Stores changes before they're saved
  const [updatedBlob,setUpdatedBlob] = useState(null);
  const [isEditing,setIsEditing] = useState(false);

  function startEditing() {
    setUpdatedBlob(annotation.blob);
    setIsEditing(true);
  }
  function saveChanges() {
    updateAnnotation(annotation.id, {...annotation, blob: updatedBlob});
    setUpdatedBlob(null);
    setIsEditing(false);
  }
  function discardChanges() {
    setUpdatedBlob(null);
    setIsEditing(false);
  }
  function deleteAnnotation() {
    let c = window.confirm('Are you sure you want to delete this annotation?');
    if (c) {
      dispatch(annotationActions['deleteSingle'](annotation.id));
    }
  }
  // Event Handlers
  function onChange(e) {
    setUpdatedBlob(e.target.value);
  }
  function onKeyPress(e) {
    const ENTER = 13;
    if (e.ctrlKey && e.which === ENTER) {
      saveChanges();
    }
  }

  function parseBlob(annotation) {
    switch (annotation.parser) {
      case 'plaintext':
        return annotation.blob;
      case 'commonmark':
        let reader = new commonmark.Parser();
        let writer = new commonmark.HtmlRenderer({safe: true});
        let parsed = reader.parse(annotation.blob); // parsed is a 'Node' tree
        let parsedBlob = writer.render(parsed);
        return parsedBlob;
      default:
        return 'Error: Invalid Parser ('+(annotation.parser)+')';
    }
  }

  let style = {};
  let classNames = ['card'];
  // Align card with annotation
  let yCoord = null;
  if (annotation.type === 'point') {
    yCoord = annotation.position.coords[1];
  } else if (annotation.type === 'rect') {
    yCoord = (annotation.position.box[0]+annotation.position.box[2])/2;
  }
  yCoord *= scale;
  style['top'] = yCoord+'px';
  // Make sure card is visible if it's the current active card
  if (isActive) {
    classNames.push('active');
  }

  if (isEditing) {
    return (<div className={classNames.join(' ')} style={style}
        onClick={()=>setActive(true)}>
      <textarea onChange={onChange}
          onKeyPress={onKeyPress}
          value={updatedBlob} />
      <div className='controls'>
        <span onClick={()=>setActive(!isActive)}>
          <i className='material-icons'>
            {isActive ? 'navigate_before' : 'navigate_next'}
          </i>
        </span>
        <span onClick={saveChanges}>
          <i className='material-icons'>save</i>
        </span>
        <span onClick={discardChanges}>
          <i className='material-icons'>cancel</i>
        </span>
        <span onClick={deleteAnnotation}>
          <i className='material-icons'>delete</i>
        </span>
      </div>
    </div>);
  } else {
    let parsedBlob = parseBlob(annotation);
    return (<div className={classNames.join(' ')} style={style}
        onClick={()=>isActive?null:setActive(true)}>
      <div dangerouslySetInnerHTML={{__html: parsedBlob}} />
      <div className='controls'>
        <span onClick={()=>setActive(!isActive)}>
          <i className='material-icons'>
            {isActive ? 'navigate_before' : 'navigate_next'}
          </i>
        </span>
        <span onClick={startEditing}>
          <i className='material-icons'>create</i>
        </span>
        <span onClick={deleteAnnotation}>
          <i className='material-icons'>delete</i>
        </span>
      </div>
    </div>);
  }
}

function AnnotationCardsContainer(props) {
  const {
    annotations,
    activeId, setActiveId,
    updateAnnotation,
    scale
  } = props;
  return (<div className='annotation-cards-container'>
    {
      Object.values(annotations).map(function(ann){
        return (
          <AnnotationTextCard
              key={ann.id}
              scale={scale}
              isActive={ann.id === activeId}
              setActive={(f)=>setActiveId(f ? ann.id : null)}
              annotation={ann}
              updateAnnotation={updateAnnotation} />
        );
      })
    }
  </div>)
}

//////////////////////////////////////////////////
// PDF Rendering
//////////////////////////////////////////////////

function PdfViewer(props) {
  const {
    page,
    scale
  } = props;
  const ref = useRef(null);

  // Render PDF
  useEffect(() => {
    if (!ref.current || !page) {
      return;
    }
    var viewport = page.getViewport({ scale: scale, });
    var canvas = ref.current;
    var context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    var renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    page.render(renderContext);
    // TODO: Render text layer
  }, [page, ref.current, scale]);

  return (
    <canvas ref={ref}></canvas>
  );
}

function PdfPageContainer(props) {
  const {
    activeId, setActiveId,
    toolState,
    eventHandlers,
    createAnnotation,
    updateAnnotation,
    annotations,
    page, pageNum,
    scale
  } = props;
  const relevantAnnotations = Object.values(annotations).filter(
    ann => ann && ann.page === pageNum
  ).reduce(function(acc,ann){
    acc[ann.id] = ann;
    return acc;
  },{});
  return (
    <div className='pdf-page-container'>
      <div className='pdf-container'>
        <PdfViewer page={page} scale={scale}/>
        <AnnotationLayer
            eventHandlers={eventHandlers}
            toolState={toolState}
            createAnnotation={createAnnotation}
            updateAnnotation={updateAnnotation}
            annotations={relevantAnnotations}
            page={pageNum}
            scale={scale} />
      </div>
      <AnnotationCardsContainer
          createAnnotation={createAnnotation}
          updateAnnotation={updateAnnotation}
          activeId={activeId}
          setActiveId={setActiveId}
          annotations={relevantAnnotations}
          scale={scale} />
    </div>
  );
}

function usePdfPages(doc) {
  const [pdf,setPdf] = useState(null);
  const [pages,setPages] = useState({});
  const [progress,setProgress] = useState(null);
  const [error,setError] = useState(null);
  const pagesRef = useRef({}); // Ref is needed because multiple setPages in one update cycle will overwrite each other.
  useEffect(()=>{
    if (!doc) {
      return;
    }
    window.pdfjsLib.getDocument({
      url: process.env.REACT_APP_SERVER_ADDRESS+"/data/documents/"+doc.id+'/pdf',
      withCredentials: true
    }).promise .then(pdf => {
      setPdf(pdf);
      setProgress({
        totalPages: pdf.numPages,
        loadedPages: 0
      });
    }).catch(error => {
      console.error(error);
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError(error.message || "Error Loading PDF");
      }
    });
  },[doc]);
  useEffect(()=>{
    if (!pdf) {
      return;
    }
    for (let i = 1; i <= pdf.numPages; i++) {
      pdf.getPage(i).then(p => {
        pagesRef.current[i] = p;
        let loadedPages = Object.values(pagesRef.current).length;
        setProgress({
          totalPages: pdf.numPages,
          loadedPages
        });
        if (loadedPages === pdf.numPages) {
          setPages(pagesRef.current);
        }
      });
    }
  },[pdf]);
  return {
    pdf,
    pages,
    progress,
    error
  }
}

//////////////////////////////////////////////////
// Doc Info
//////////////////////////////////////////////////

function DocInfoContainer(props) {
  const {
    doc,
    updateDoc
  } = props;
  const [hidden,setHidden] = useState(true);
  let classNames = generateClassNames({
    'doc-info-container': true,
    'hidden': hidden
  })
  return (<div className={classNames}>
    <div className='controls' onClick={()=>setHidden(!hidden)}>
    {
      hidden ?
      <i className='material-icons'>navigate_before</i> :
      <i className='material-icons'>navigate_next</i>
    }
    </div>
    <h1>Details</h1>
    <DocInfoForm doc={doc} updateDoc={updateDoc} />
  </div>);
}

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
    <label>
      <span>Title</span>
      <input type='text' name='title' value={doc['title'] || ''} onChange={handleChange} />
    </label>
    <label>
      <span>Authors</span>
      <input type='text' name='author' value={doc['author'] || ''} onChange={handleChange} />
    </label>
    <label>
      <span>URL</span>
      <input type='text' name='url' value={doc['url'] || ''} onChange={handleChange} />
    </label>
    <label>
      <span>Bibtex</span>
      <textarea name='bibtex' value={doc['bibtex'] || ''} onChange={handleChange} />
    </label>
  </div>);
}

//////////////////////////////////////////////////
// Full Page
//////////////////////////////////////////////////

export default function PdfAnnotationPage(props) {
  const {
  } = props;
  const {
    docId
  } = useParams();

  const dispatch = useDispatch();

  const doc = useSelector(state => state.documents.entities[docId]);

  const {
    pdf,
    pages,
    progress:pagesLoadingProgress,
    error:pagesLoadingError
  } = usePdfPages(doc);

  const [pdfScale,setPdfScale] = useState(2);
  const annotations = useSelector(
    state => filterDict( 
      state.annotations.entities,
      ann => !ann.deleted_at && ann.doc_id === parseInt(docId)
    )
  );
  const [activeId, setActiveId] = useState(null);
  const [toolState, setToolState] = useState(null);
  const [toolStateStack, setToolStateStack] = useState([]);

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
    dispatch(documentActions['fetchSingle'](docId));
    dispatch(annotationActions['fetchMultiple']({doc_id: docId}));
  },[docId]);

  // CRUD Functions
  function createAnnotation(ann) {
    dispatch(annotationActions['saveCheckpoint']());
    ann['blob'] = "# Notes\nWrite your notes here";
    // Parser to convert blob into HTML
    // Possible values: text, commonmark
    ann['parser'] = 'commonmark';
    ann['doc_id'] = docId;
    dispatch(annotationActions['create'](ann)).then(response => {
      let newAnnotations = response.data.entities.annotations;
      let newKeys = Object.keys(newAnnotations);
      setActiveId(parseInt(newKeys[0]));
    });
  }
  function updateAnnotation(id, ann) {
    dispatch(annotationActions['saveCheckpoint']());
    dispatch(annotationActions['update'](ann));
  }
  function deleteAnnotation(id) {
    dispatch(annotationActions['saveCheckpoint']());
    dispatch(annotationActions['deleteSingle'](id));
  }
  function updateDoc(id, doc) {
    dispatch(documentActions['saveCheckpoint']());
    dispatch(documentActions['update'](doc));
  }

  // Tools
  function handleDoubleClick(event,data) {
    switch (data.ann.type) {
      case 'rect':
      case 'point':
        let newState = tools['resize'].initState();
        newState.selectedAnnotationId = data.ann.id;
        newState.tempPosition = data.ann.position;
        pushTool(newState);
        break;
    }
  }
  const tools = {
    read: {
      initState: function() {
        return {
          type: 'read'
        };
      },
      eventHandlers: {
        pdf: {
          onClick: function(event,data) {
            setActiveId(null);
            popTool();
          }
        },
        annotation: {
          onClick: function(event,data) {
            setActiveId(data.id);
          },
          onDoubleClick: handleDoubleClick,
        }
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
          onClick: function() {
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
          onKeyPress: function() {},
          onKeyPress: function() {},
        },
        // Handles events on the annotation
        annotation: {
          onClick: function(event, data) {
            if (toolState.dragAction) {
              // This happens if the mouse was dragged out of the screen,
              // then released, and moved back in. We want to continue the
              // dragging action.
              return;
            } else {
              setToolState({
                ...toolState,
                selectedAnnotationId: data.id,
                tempPosition: null,
              });
            }
          },
          onMouseDown: function(event, data) {
            if (toolState.dragAction) {
              // This happens if the mouse was dragged out of the screen,
              // then released, and moved back in. We want to continue the
              // dragging action.
              return;
            } else {
              // Start moving annotation if appropriate
              const classNames = event.target.className.split(' ');
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
          onKeyPress: function(event,data) {
            if (event.key === 'Delete') {
              const selId = toolState.selectedAnnotationId;
              if (selId && selId !== data.id) {
                console.error('Mismatch between selected ID and focused DOM element. Not deleting anything until the conflict is resolved.');
              } else {
                deleteAnnotation(data.id);
                setToolState({
                  ...toolState,
                  selectedAnnotationId: null,
                  tempPosition: null
                });
              }
            }
          },
        },
        // Handles events on the annotation's control points
        controlPoint: {
          onMouseDown: function(event, data) {
            if (toolState.dragAction) {
              // This happens if the mouse was dragged out of the screen,
              // then released, and moved back in. We want to continue the
              // dragging action.
              return;
            } else {
              // Start resizing if appropriate
              const classNames = event.target.className.split(' ');
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
        onMouseMove: function(event,data) {
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
          const vp = pages[annotations[selId].page].getViewport({scale:1});
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
        onMouseUp: function(event,data) {
          const selId = toolState.selectedAnnotationId;
          if (selId !== null && annotations[selId] && toolState.tempPosition) {
            updateAnnotation(selId, {
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
          onClick: function(event,data) {
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
          onDoubleClick: handleDoubleClick,
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
          onClick: function() {
            if (toolState.tempAnnotation) {
              // Continue creating the annotation
              return
            } else {
              popTool();
            }
          },
          onMouseDown: function(event,data) {
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
          onDoubleClick: handleDoubleClick,
          onMouseDown: function(event,data) {
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
        onMouseMove: function(event,data) {
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
        onMouseUp: function(event,data) {
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
    }
  };

  // Initialize State
  useEffect(() => {
    setToolState(tools.rect.initState());
  }, []);

  // Misc
  function activateAnnotation(annId) {
    setActiveId(annId);
    if (annId) { // Check if we're activating or deactivating
      setToolState({
        ...tools.resize.initState(),
        selectedAnnotationId: annId,
        tempPosition: annotations[annId].position
      });
    }
  }
  function zoomIn() {
    setPdfScale(Math.min(pdfScale+0.2,3));
  }
  function zoomOut() {
    setPdfScale(Math.max(pdfScale-0.2,1));
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
      console.log(event.key);
      if (event.key === 'ArrowRight') {
        scrollToNextPage();
      } else if (event.key === 'ArrowLeft') {
        scrollToPrevPage();
      }
    }
  }
  function scrollToNextPage() {
    const margin = 5;
    const pageHeights = Object.values(pages).map(
      page => page.getViewport({scale: pdfScale}).height+margin
    ); // FIXME: This assumes we iterate the object in the order of the pages.
    let scrollTo = 0;
    let pos = window.scrollY;
    for (let ph of pageHeights) {
      scrollTo += ph;
      if (pos < ph) {
        break;
      }
      pos -= ph;
    }
    window.scrollTo(window.scrollX,scrollTo);
  }
  function scrollToPrevPage() {
    const margin = 5;
    const pageHeights = Object.values(pages).map(
      page => page.getViewport({scale: pdfScale}).height+margin
    ); // FIXME: This assumes we iterate the object in the order of the pages.
    let scrollTo = 0;
    let pos = window.scrollY;
    for (let ph of pageHeights) {
      if (pos <= ph) {
        break;
      }
      scrollTo += ph;
      pos -= ph;
    }
    window.scrollTo(window.scrollX,scrollTo);
  }

  // Can't render until everything is initialized
  if (toolState === null) {
    return null;
  }
  if (pdf && Object.entries(pages).length !== pdf.numPages) {
    return null;
  }
  if (pagesLoadingError) {
    window.error = pagesLoadingError;
    return (<main className='annotation-container'>
      {pagesLoadingError}
    </main>);
  }

  return (<main className='annotation-container' onKeyDown={handleKeyDown}>
    {Object.entries(pages).map(function([pageNum,page],i){
      return <PdfPageContainer key={pageNum}
          activeId={activeId} setActiveId={activateAnnotation}
          toolState={toolState}
          eventHandlers={tools[toolState.type].eventHandlers}
          createAnnotation={createAnnotation}
          updateAnnotation={updateAnnotation}
          annotations={annotations}
          page={page} pageNum={pageNum}
          scale={pdfScale}
          />
    })}
    <DocInfoContainer doc={doc} updateDoc={updateDoc} />
    <div className='controls'>
      <button onClick={()=>selectTool('read')} className={toolState.type === 'read' ? 'active' : null}>
        Read
      </button>
      <button onClick={()=>selectTool('resize')} className={toolState.type === 'resize' ? 'active' : null}>
        Resize
      </button>
      <button onClick={()=>selectTool('point')} className={toolState.type === 'point' ? 'active' : null}>
        Point
      </button>
      <button onClick={()=>selectTool('rect')} className={toolState.type === 'rect' ? 'active' : null}>
        Rect
      </button>
      <button onClick={zoomIn}>
        +
      </button>
      <button onClick={zoomOut}>
        -
      </button>
      <button onClick={()=>dispatch(annotationActions['undo']())}>
        Undo
      </button>
      <button onClick={()=>dispatch(annotationActions['redo']())}>
        Redo
      </button>
    </div>
  </main>);
}
