import React from 'react';
import { useEffect, useState, useRef } from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { useParams, useLocation } from "react-router-dom";
import * as commonmark from 'commonmark';
import * as pdfjsLib from 'pdfjs-dist/webpack';

import { Button, TextField } from './Inputs.js';
import {clip,filterDict,generateClassNames,formChangeHandler} from './Utils.js';
import {documentActions,annotationActions} from './actions/index.js';

import './PdfViewer.scss';

//////////////////////////////////////////////////
// Annotations
//////////////////////////////////////////////////

function AnnotationLayer(props) {
  const {
    annotations,
    eventHandlers,
    toolState,
    page,
    pageNum,
    scale
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
  function checkAnnotationCollision(coords) {
    // Check the annotations drawn on the canvas for collision with the given coord
    // Return the ID of the collided annotation, or null if no collision.
    let radius = 10;
    for (let ann of Object.values(annotations)) {
      if (ann.type !== 'highlight') {
        continue;
      }
      for (let i = 0; i < ann.position.points.length-1; i++) {
        let p0 = ann.position.points[i];
        let p1 = ann.position.points[i+1];
        // Check that the length of the orthogonal projection is within the highlight width.
        let p0c = [coords[0]-p0[0],coords[1]-p0[1]];
        let p0p1 = [p1[0]-p0[0],p1[1]-p0[1]];
        let p0p1o = [-p0p1[1],p0p1[0]]; // Orthogonal to p0p1
        let len = Math.sqrt(p0p1[0]*p0p1[0]+p0p1[1]*p0p1[1]); // Len of p0p1
        let dist = (p0c[0]*p0p1o[0]+p0c[1]*p0p1o[1])/len;
        if (Math.abs(dist) > radius) {
          continue;
        }
        // If the length of the projection is longer than the vector it's projected on, then we're too far from the segment.
        let proj = (p0c[0]*p0p1[0]+p0c[1]*p0p1[1])/len;
        if (proj > len || proj < 0) {
          continue;
        }
        // Collision found
        return ann.id;
      }
    }
    return null;
  }
  function onClick(event) {
    const coords = getCoordsFromEvent(event);
    const data = {
      page: pageNum,
      coords
    };
    // Clicked on PDF
    if (event.target === ref.current) {
      // Check all annotations for click
      let annId = checkAnnotationCollision(coords);
      if (annId) {
        setFocusedId(annId);
        let callback = eventHandlers.annotation.onClick;
        if (callback) {
          callback(event, {id: annId});
        }
        return;
      }
      setFocusedId(null); // Unfocus if nothing was clicked
      // If annotations haven't been clicked...
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
      page: pageNum,
      coords,
      ann
    };

    const classNames = event.target.className.split(' ');
    let callback = null;
    if (event.target === ref.current) {
      // Check all annotations for click
      let annId = checkAnnotationCollision(coords);
      if (annId) {
        let callback = eventHandlers.annotation.onDoubleClick;
        if (callback) {
          callback(event, {...data, ann: annotations[annId]});
        }
        return;
      }
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
      page: pageNum,
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
      page: pageNum,
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
      page: pageNum,
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
      page: pageNum,
    };
    // Target = pdf document
    if (event.target === ref.current) {
      if (focusedId) {
        let callback = eventHandlers.annotation.onKeyPress;
        if (callback) {
          callback(event, {id: focusedId});
        }
      } else {
        let callback = eventHandlers.pdf.onKeyPress;
        if (callback) {
          callback(event, data);
        }
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
        page: pageNum,
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
          id={'annotation'+ann.id}
          tabIndex={-1}
          key={key}
          style={style}
          onClick={onClick}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
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
          id={'annotation'+ann.id}
          tabIndex={-1}
          key={key}
          style={style}
          onClick={onClick}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
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
      default:
        return null;
    }
  }
  useEffect(()=>{
    if (!ref.current) {
      return;
    }
    if (!page) {
      return;
    }
    let viewport = page.getViewport({ scale: scale, });
    let canvas = ref.current;
    let context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    // Render drawn markings
    function renderLine(points, selected) {
      if (selected) {
        context.strokeStyle = 'rgba(100,255,100,0.3)';
      } else {
        context.strokeStyle = 'rgba(255,255,100,0.3)';
      }
      context.lineWidth = 20;
      context.beginPath();
      let p = points[0];
      context.moveTo(p[0]*scale,p[1]*scale);
      for (p of points.slice(1)) {
        context.lineTo(p[0]*scale,p[1]*scale);
      }
      context.stroke();
    }
    for (let ann of Object.values(annotations)) {
      if (ann.type === 'highlight') {
        renderLine(
          ann.position.points,
          ann.id === toolState.selectedAnnotationId
        );
      }
    }
    // Render marking that's in the process of being drawn
    if (toolState.type === 'highlight') {
      if (toolState.points) {
        if (toolState.keepStraight) {
          let points = [toolState.points[0],toolState.points[toolState.points.length-1]];
          renderLine(points);
        } else {
          renderLine(toolState.points);
        }
      }
    }
  },[page, ref.current, annotations, toolState, scale]);

  return <div className='annotation-layer'>
    <canvas ref={ref} onDoubleClick={onDoubleClick}
        onKeyDown={onKeyPress} tabIndex={-1}
        onClick={onClick} onMouseDown={onMouseDown}
        onMouseUp={onMouseUp} onMouseMove={onMouseMove} />
    {
      Object.values(annotations).map(renderAnnotation)
    }
    { toolState.tempAnnotation && renderAnnotation(toolState.tempAnnotation) }
  </div>;
}

function AnnotationCard(props) {
  const {
    annotation,
    isActive, setActive,
    updateAnnotation,
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

  const [refreshing,setRefreshing] = useState(false);
  function refresh() {
    // Momentarily hide the div to force a rerender
    setRefreshing(true);
  }
  useEffect(()=>{
    if (!refreshing) {
      return;
    }
    setRefreshing(false);
  },[refreshing])

  let classNames = generateClassNames({
    card: true,
    active: isActive
  });
  if (isEditing) {
    return (<div className={classNames}
        onClick={()=>setActive(true)} id={'card'+annotation.id}>
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
    return (<div className={classNames}
        onClick={()=>isActive?null:setActive(true)} id={'card'+annotation.id}>
      {
        !refreshing &&
        <div dangerouslySetInnerHTML={{__html: parsedBlob}} />
      }
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
        <span onClick={refresh}>
          <i className='material-icons'>sync</i>
        </span>
        <span>
          <a href={'#annotation'+annotation.id}>scroll into view</a>
        </span>
        {
          annotation.type === 'rect' &&
          (
            <span>
              <a href={process.env.REACT_APP_SERVER_ADDRESS+"/data/annotations/"+annotation.id+'/img'}>img</a>
            </span>
          )
        }
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

  const [scrollYPos, setScrollYPos] = useState(0);

  useEffect(()=>{
    if (!activeId) {
      return;
    }
    if (annotations[activeId].type === 'highlight') {
      return;
    }
    let card = document.getElementById('card'+activeId);
    setScrollYPos(window.scrollY-card.offsetTop+30);
  },[activeId]);

  const style = {
    transform: 'translateY('+scrollYPos+'px)'
  };
  return (<div className='annotation-cards-container' style={style}>
    {
      Object.values(annotations).filter(
        ann => ann.type === 'rect' || ann.type === 'point'
      ).map(function(ann){
        return (
          <AnnotationCard
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
    scale,
    onRenderingStatusChange = ()=>null
  } = props;
  const ref = useRef(null);

  // Needs to be rerendered if the page or scale changes
  const [needsRender,setNeedsRender] = useState(false);
  useEffect(() => {
    setNeedsRender(true);
  }, [page, scale]);

  // Render PDF
  const [doneRendering,setDoneRendering] = useState(true);
  useEffect(() => {
    if (!ref.current || !page) {
      return;
    }
    if (!doneRendering) {
      return;
    }
    if (!needsRender) {
      return;
    }
    let viewport = page.getViewport({ scale: scale, });
    let canvas = ref.current;
    let context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    var renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    page.render(renderContext).promise.then(x => {
      setDoneRendering(true);
      onRenderingStatusChange(true);
    });
    setNeedsRender(false);
    setDoneRendering(false);
    onRenderingStatusChange(false);
  }, [ref.current, needsRender, doneRendering]);

  return (
    <canvas ref={ref}></canvas>
  );
}

function PdfTextLayer(props) {
  // I just copied this over from PdfViewer. There's probably a lot of unnecessary code here.
  const {
    page,
    scale,
    onRenderingStatusChange = ()=>null,
    hidden=false
  } = props;
  const ref = useRef(null);

  // Needs to be rerendered if the page or scale changes
  const [needsRender,setNeedsRender] = useState(false);
  useEffect(() => {
    setNeedsRender(true);
  }, [page, scale]);

  // Render PDF
  const [doneRendering,setDoneRendering] = useState(true);
  useEffect(() => {
    if (!ref.current || !page) {
      return;
    }
    if (!doneRendering) {
      return;
    }
    if (!needsRender) {
      return;
    }
    let viewport = page.getViewport({ scale: scale, });

    page.getTextContent().then(content => {
      var renderContext = {
        textContent: content,
        viewport: viewport,
        container: ref.current,
        textDivs: []
      };
      pdfjsLib.renderTextLayer(renderContext).promise.then(x => {
        setDoneRendering(true);
        onRenderingStatusChange(true);
      });
      setNeedsRender(false);
      setDoneRendering(false);
      onRenderingStatusChange(false);
    });
  }, [page, ref.current, needsRender, doneRendering]);

  let classNames = generateClassNames({
    'text-layer': true,
    hidden
  })
  return (
    <div className={classNames} ref={ref}>
    </div>
  );
}

function PdfPageContainer(props) {
  const {
    toolState,
    eventHandlers,
    createAnnotation,
    updateAnnotation,
    annotations,
    page, pageNum,
    scale
  } = props;
  const relevantAnnotations = filterDict(
    annotations, ann => ann && ann.page === pageNum
  );

  // Delay rendering annotations until the pdf is rendered
  const [renderingStatus,setRenderingStatus] = useState(null);
  const [annotationScale,setAnnotationScale] = useState(null);
  useEffect(()=>{
    if (renderingStatus === true) {
      setAnnotationScale(scale);
    }
  },[scale,renderingStatus]);

  return (
    <div className='pdf-page-container'>
      <div className='pdf-container'>
        <PdfViewer page={page} scale={scale}
            onRenderingStatusChange={setRenderingStatus}/>
        {
          annotationScale &&
          <AnnotationLayer
              eventHandlers={eventHandlers}
              toolState={toolState}
              createAnnotation={createAnnotation}
              updateAnnotation={updateAnnotation}
              annotations={relevantAnnotations}
              page={page}
              pageNum={pageNum}
              scale={annotationScale} />
        }
        <PdfTextLayer page={page} scale={scale}
            onRenderingStatusChange={setRenderingStatus}
            hidden={toolState.type !== 'text'}/>
      </div>
    </div>
  );
}

function usePdfPages(doc) {
  const [pdf,setPdf] = useState(null);
  const [pages,setPages] = useState({});
  const [progress,setProgress] = useState(null);
  const [error,setError] = useState(null);
  const pagesRef = useRef({}); // Ref is needed because multiple setPages in one update cycle will overwrite each other.
  const docId = doc && doc.id;
  useEffect(()=>{
    if (docId === null || docId === undefined) {
      return;
    }
    pdfjsLib.getDocument({
      url: process.env.REACT_APP_SERVER_ADDRESS+"/data/documents/"+docId+'/pdf',
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
  },[docId]);
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
      <TextField name='title' value={doc['title'] || ''} onChange={handleChange} />
    </label>
    <label>
      <span>Authors</span>
      <TextField name='author' value={doc['author'] || ''} onChange={handleChange} />
    </label>
    <label>
      <span>URL</span>
      <TextField name='url' value={doc['url'] || ''} onChange={handleChange} />
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
    docId
  } = useParams();
  const dispatch = useDispatch();
  const location = useLocation();
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

  // If linked to a specific annotation, scroll it into view
  useEffect(() => {
    let hash = location.hash;
    if (hash) {
      // Parse out relevant IDs
      let id = null;
      if (hash.startsWith('#annotation')) {
        id = parseInt(hash.slice('#annotation'.length));
      } else if (hash.startsWith('#card')) {
        id = parseInt(hash.slice('#card'.length));
      }
      // Wait until element is loaded to scroll it into view
      function scrollWhenFound() {
        let elem = document.getElementById(hash.slice(1));
        if (!elem) {
          window.setTimeout(scrollWhenFound, 100);
          return;
        }
        elem.scrollIntoView();
        setActiveId(id);
      }
      scrollWhenFound();
    }
  }, []);

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
          onClick: function() {
            if (toolState.points) {
              // Continue creating the annotation
              return
            } else {
              popTool();
            }
          },
          onMouseDown: function(event,data) {
            if (toolState.points) {
              // Continue creating the annotation
              return
            } else {
              setToolState({
                ...toolState,
                points: [data.coords]
              });
            }
          },
        },
        annotation: {
          onDoubleClick: handleDoubleClick,
        },
        controlPoint: {},
        onMouseMove: function(event,data) {
          const {coords} = data;
          if (toolState.points) {
            setToolState({
              ...toolState,
              points: [...toolState.points, coords],
              keepStraight: event.ctrlKey
            });
          }
        },
        onMouseUp: function(event,data) {
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
              if (toolState.keepStraight) {
                createAnnotation({
                  type: 'highlight',
                  position: {
                    points: [toolState.points[0],toolState.points[toolState.points.length-1]]
                  },
                  page: data.page
                });
              } else {
                createAnnotation({
                  type: 'highlight',
                  position: {
                    points: toolState.points
                  },
                  page: data.page
                });
              }
            }
          }
          setToolState({
            ...toolState,
            points: null,
          })
        },
      }
    },
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
      <DocInfoContainer doc={doc} updateDoc={updateDoc} />
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
    <AnnotationCardsContainer
        annotations={annotations}
        activeId={activeId} setActiveId={activateAnnotation}
        updateAnnotation={updateAnnotation}
        scale={pdfScale} />
    <DocInfoContainer doc={doc} updateDoc={updateDoc} />
    <div className='controls'>
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
      <Button onClick={zoomIn}>
        +
      </Button>
      <Button onClick={zoomOut}>
        -
      </Button>
      <Button onClick={()=>dispatch(annotationActions['undo']())}>
        Undo
      </Button>
      <Button onClick={()=>dispatch(annotationActions['redo']())}>
        Redo
      </Button>
    </div>
  </main>);
}
