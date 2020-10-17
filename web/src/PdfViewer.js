import React from 'react';
import { useEffect, useState, useRef } from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { useParams } from "react-router-dom";
import * as commonmark from 'commonmark';

import {documentActions,annotationActions} from './actions/index.js';

import './PdfViewer.scss';

function filterDict(dict,filterCondition) {
  return Object.entries(dict).filter(function([k,v]) {
    return filterCondition(v);
  }).reduce((acc,[k,v]) => {
    acc[k] = v;
    return acc;
  }, {});
}

function PdfViewer(props) {
  const {
    page
  } = props;
  const ref = useRef(null);

  // Render PDF
  useEffect(() => {
    if (!ref.current || !page) {
      return;
    }
    var scale = 2;
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
  }, [page, ref.current]);

  return (
    <canvas ref={ref}></canvas>
  );
}

function AnnotationLayer(props) {
  const {
    createAnnotation,
    updateAnnotation,
    annotations,
    eventHandlers,
    toolState,
    page
  } = props;

  const ref = useRef(null);

  /*
   * Tool types:
   *  - select: Selection tool
   *  - point: Point annotation
   *  - rect: Rectangle annotation
   */
  const [tool,setTool] = useState('rect')

  const [startMouseCoord,setStartMouseCoord] = useState(null);
  const [mouseCoord,setMouseCoord] = useState(null);
  const [mouseMoved,setMouseMoved] = useState(false);

  // Event Handlers
  function getCoordsFromEvent(event) {
    // Ensure that the coordinates are relative to the correct element
    const rect = ref.current.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
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
  function onMouseDown(event) {
    const coords = getCoordsFromEvent(event);
    setStartMouseCoord(coords);
    const data = {
      page,
      coords
    };

    const classNames = event.target.className.split(' ');
    // Target = pdf document
    if (event.target === ref.current) {
      let callback = eventHandlers.pdf.onMouseDown;
      if (callback) {
        callback(event, data);
      }
    } else if (classNames.indexOf('annotation') !== -1) {
      let callback = eventHandlers.annotation.onMouseDown;
      if (callback) {
        callback(event, data);
      }
    } else if (classNames.indexOf('control') !== -1) {
      let callback = eventHandlers.controlPoint.onMouseDown;
      if (callback) {
        callback(event, data);
      }
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
      let callback = eventHandlers.annotation.onKeyPress;
      if (callback) {
        callback(event, data);
      }
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
        position: toolState.tempPosition
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
    switch (ann.type) {
      case 'point':
        style = {
          left: ann.position.coords[0],
          top: ann.position.coords[1],
        };
        classNames.push('point');
        return <div className={classNames.join(' ')}
          tabIndex={-1}
          key={key}
          style={style}
          onClick={onClick}>
        </div>;
      case 'rect':
        style = {
          top: ann.position.box[0],
          left: ann.position.box[3],
          height: ann.position.box[2]-ann.position.box[0],
          width: ann.position.box[1]-ann.position.box[3],
        };
        classNames.push('rect');
        return <div className={classNames.join(' ')}
          tabIndex={-1}
          key={key}
          style={style}
          onClick={onClick}>
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
    updateAnnotation
  } = props;
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
  style['top'] = yCoord+'px';
  // Make sure card is visible if it's the current active card
  if (isActive) {
    classNames.push('active');
  }

  if (isEditing) {
    return <div className={classNames.join(' ')} style={style}
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
        <span>
          <i className='material-icons'>delete</i>
        </span>
      </div>
    </div>;
  } else {
    let parsedBlob = parseBlob(annotation);
    return <div className={classNames.join(' ')} style={style}
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
        <span>
          <i className='material-icons'>delete</i>
        </span>
      </div>
    </div>;
  }
}

function AnnotationTextContainer(props) {
  const {
    annotations,
    activeId, setActiveId,
    updateAnnotation
  } = props;
  function renderTextCard(ann) {
  }
  return (<div className='annotation-text-container'>
    {
      Object.values(annotations).map(function(ann){
        return (
          <AnnotationTextCard
              key={ann.id}
              isActive={ann.id === activeId}
              setActive={(f)=>setActiveId(f ? ann.id : null)}
              annotation={ann}
              updateAnnotation={updateAnnotation} />
        );
      })
    }
  </div>)
}

function PdfPageContainer(props) {
  const {
    activeId, setActiveId,
    toolState,
    eventHandlers,
    createAnnotation,
    updateAnnotation,
    annotations,
    page, pageNum
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
        <PdfViewer page={page} />
        <AnnotationLayer
            eventHandlers={eventHandlers}
            toolState={toolState}
            createAnnotation={createAnnotation}
            updateAnnotation={updateAnnotation}
            annotations={relevantAnnotations}
            page={pageNum} />
      </div>
      <AnnotationTextContainer
          createAnnotation={createAnnotation}
          updateAnnotation={updateAnnotation}
          activeId={activeId}
          setActiveId={setActiveId}
          annotations={relevantAnnotations} />
    </div>
  );
}

function usePdfPages(pdfUrl) {
  const [pdf,setPdf] = useState(null);
  const [pages,setPages] = useState({});
  const [progress,setProgress] = useState(null);
  const pagesRef = useRef({}); // Ref is needed because multiple setPages in one update cycle will overwrite each other.
  useEffect(()=>{
    if (!pdfUrl) {
      return;
    }
    window.pdfjsLib.getDocument(
      pdfUrl
    ).promise .then(pdf => {
      setPdf(pdf);
      setProgress({
        totalPages: pdf.numPages,
        loadedPages: 0
      });
    }).catch(error => {
      console.error(error);
    });
  },[pdfUrl]);
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
    progress
  }
}

export default function PdfAnnotationContainer(props) {
  const {
  } = props;
  const {
    docId
  } = useParams();

  const dispatch = useDispatch();
  const doc = useSelector(state => state.documents.entities[docId]);
  const pdfUrl = doc ? doc.url : null;

  const {pdf,pages,progress:pagesLoadingProgress} = usePdfPages(pdfUrl);

  const annotations = useSelector(
    state => filterDict( 
      state.annotations.entities,
      ann => ann.doc_id === parseInt(docId)
    )
  );
  const [activeId, setActiveId] = useState(null);
  const [toolState, setToolState] = useState(null);

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
    ann['blob'] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum lectus lacus, sodales in ipsum eget, dapibus consequat sapien. Nam eu vestibulum ante, egestas pharetra lacus. Pellentesque sodales finibus dolor, at blandit lacus dictum ac. Maecenas vel mattis leo, nec rhoncus augue. Vestibulum eget fermentum nunc. Sed laoreet, est quis ullamcorper dignissim, risus ante dictum nisl, vel posuere erat erat eu dui. Suspendisse gravida euismod nunc ut tincidunt. Vivamus id vehicula diam, a rhoncus mauris. Phasellus mattis nibh et justo finibus ultricies.\n# Heading!\n## Subheading\n\nList?\n- thing\n- other thing\n\n```\nif a==b:\n    return c\n```\n\n[Google Link](http://www.google.ca)"; // Temporary blurb
    // Parser to convert blob into HTML
    // Possible values: text, commonmark
    ann['parser'] = 'commonmark';
    ann['doc_id'] = docId;
    dispatch(annotationActions['create'](ann));
  }
  function updateAnnotation(id, ann) {
    dispatch(annotationActions['update'](ann));
  }
  function deleteAnnotation(id) {
    dispatch(annotationActions['deleteSingle'](id));
  }

  // Tools
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
          }
        },
        annotation: {
          onClick: function(event,data) {
            setActiveId(data.id);
          }
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
        };
      },
      eventHandlers: {
        // Handles events on the PDF document body
        pdf: {
          onClick: function() {
            setToolState({
              ...toolState,
              selectedAnnotationId: null
            });
          },
          onMouseDown: function() {},
          onMouseMove: function() {},
          onKeyPress: function() {},
          onKeyPress: function() {},
        },
        // Handles events on the annotation
        annotation: {
          onClick: function(event, data) {
            setToolState({
              ...toolState,
              selectedAnnotationId: data.id,
              tempPosition: annotations[data.id].position
            });
          },
          onMouseDown: function(event, data) {
            const classNames = event.target.className.split(' ');
            // Only move if the user selected it first
            if (classNames.indexOf('selected') !== -1) {
              setToolState({
                ...toolState,
                dragAction: 'move'
              });
            }
          },
          onKeyPress: function(event,data) {
            const DELETE = 46;
            if (event.which === DELETE) {
              deleteAnnotation(toolState.selectedAnnotationId);
              setToolState({
                ...toolState,
                selectedAnnotationId: null,
                tempPosition: null
              });
            }
          },
        },
        // Handles events on the annotation's control points
        controlPoint: {
          onMouseDown: function(event, data) {
            const classNames = event.target.className.split(' ');
            const directions = ['nw','n','ne','w','e','sw','s','se'];
            for (let d of directions) {
              if (classNames.indexOf(d) !== -1) {
                setToolState({
                  ...toolState,
                  dragAction: 'resize-'+d
                });
                break;
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
          if (toolState.dragAction === 'move') {
            const selType = annotations[selId].type;
            switch (selType) {
              case 'point':
                setToolState({
                  ...toolState,
                  tempPosition: {
                    coords: [
                      annotations[selId].position.coords[0]+deltaX,
                      annotations[selId].position.coords[1]+deltaY
                    ]
                  }
                });
                break;
              case 'rect':
                setToolState({
                  ...toolState,
                  tempPosition: {
                    box: [
                      annotations[selId].position.box[0]+deltaY,
                      annotations[selId].position.box[1]+deltaX,
                      annotations[selId].position.box[2]+deltaY,
                      annotations[selId].position.box[3]+deltaX
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
          if (selId !== null &&
              annotations[selId].position !== toolState.tempPosition) {
            updateAnnotation(selId, {
              ...annotations[selId],
              position: toolState.tempPosition
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
          }
        },
        annotation: {
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
        };
      },
      eventHandlers: {
        pdf: {
          onMouseDown: function() {},
        },
        annotation: {
        },
        controlPoint: {
        },
        onMouseMove: function(event,data) {
          const {coords,startMouseCoord} = data;
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
          const {coords,startMouseCoord} = data;
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
            tempAnnotation: null
          })
        },
      }
    }
  };

  // Initialize State
  useEffect(() => {
    setToolState(tools.point.initState());
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

  // Can't render until everything is initialized
  if (toolState === null) {
    return null;
  }
  if (pdf && Object.entries(pages).length !== pdf.numPages) {
    return null;
  }

  return (<main className='annotation-container'>
    {Object.entries(pages).map(([pageNum,page],i)=>{
      return <PdfPageContainer key={pageNum}
          activeId={activeId} setActiveId={activateAnnotation}
          toolState={toolState}
          eventHandlers={tools[toolState.type].eventHandlers}
          createAnnotation={createAnnotation}
          updateAnnotation={updateAnnotation}
          annotations={annotations}
          page={page} pageNum={pageNum}
          />
    })}
    <div className='controls'>
      <button onClick={()=>setToolState(tools.read.initState())}>
        Read
      </button>
      <button onClick={()=>setToolState(tools.resize.initState())}>
        Resize
      </button>
      <button onClick={()=>setToolState(tools.point.initState())}>
        Point
      </button>
      <button onClick={()=>setToolState(tools.rect.initState())}>
        Rect
      </button>
    </div>
  </main>);
}
