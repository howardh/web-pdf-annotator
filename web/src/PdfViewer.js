import React from 'react';
import { useEffect, useState, useRef } from 'react';

import './PdfViewer.scss';

function PdfViewer(props) {
  const [pdf,setPdf] = useState(null);
  const [page,setPage] = useState(null);
  const ref = useRef(null)

  // Render PDF
  useEffect(()=>{
    window.pdfjsLib.getDocument(
      'http://proceedings.mlr.press/v89/song19b/song19b.pdf'
    ).promise.then(pdf => {
      setPdf(pdf);
    }).catch(error => {
      console.error(error);
    });
  },[]);
  useEffect(() => {
    if (!pdf) {
      return;
    }
    pdf.getPage(1).then(p => {
      setPage(p);
    });
  }, [pdf]);
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
    <canvas ref={ref}>
    </canvas>
  )
}

function AnnotationLayer(props) {
  const {
    createAnnotation,
    updateAnnotation,
    annotations
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
  const [mouseDragAction,setMouseDragAction] = useState(null);

  // Temporarily store annotation before they're created
  const [tempAnnotation,setTempAnnotation] = useState(null);
  // ID of annotation selected with selection tool
  const [selectedId, setSelectedId] = useState(null);
  // Store temporary changes to selected annotation
  const [tempUpdatedSelected, setTempUpdatedSelected] = useState(null);

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
    console.log([
      'click',
      ...coords
    ]);
    if (tool === 'point') {
      if (event.target === ref.current) {
        createAnnotation({
          type: 'point',
          coords: coords
        });
      }
    } else if (tool === 'select') {
      if (event.target === ref.current) {
        setSelectedId(null);
      }
    }
  }
  function onMouseDown(event) {
    const coords = getCoordsFromEvent(event);
    console.log([
      'mouseDown',
      ...coords
    ]);
    setStartMouseCoord(coords);
    const classNames = event.target.className.split(' ');
    if (classNames.indexOf('selected') !== -1) {
      setMouseDragAction({
        action: 'move'
      });
    } else if (classNames.indexOf('control') !== -1) {
      const directions = ['nw','n','ne','w','e','sw','s','se'];
      for (let d of directions) {
        if (classNames.indexOf(d) !== -1) {
          setMouseDragAction({
            action: 'resize-'+d
          });
          break;
        }
      }
    }
  }
  function onMouseUp(event) {
    const coords = getCoordsFromEvent(event);
    console.log([
      'mouseUp',
      ...coords
    ]);
    if (mouseMoved) {
      if (tool === 'rect') {
        const left   = Math.min(coords[0],startMouseCoord[0]);
        const right  = Math.max(coords[0],startMouseCoord[0]);
        const top    = Math.min(coords[1],startMouseCoord[1]);
        const bottom = Math.max(coords[1],startMouseCoord[1]);
        createAnnotation({
          type: 'rect',
          box: [top,right,bottom,left]
        });
        setTempAnnotation(null);
      } else if (tool === 'select') {
        if (selectedId !== null && 
            annotations[selectedId] !== tempUpdatedSelected) {
          updateAnnotation(selectedId, tempUpdatedSelected);
        }
      }
    }
    setStartMouseCoord(null);
    setMouseMoved(false);
    setMouseDragAction(null);
  }
  function onMouseMove(event) {
    const coords = getCoordsFromEvent(event);
    setMouseMoved(true);
    if (!startMouseCoord) {
      return;
    }
    if (tool === 'rect') {
      const left   = Math.min(coords[0],startMouseCoord[0]);
      const right  = Math.max(coords[0],startMouseCoord[0]);
      const top    = Math.min(coords[1],startMouseCoord[1]);
      const bottom = Math.max(coords[1],startMouseCoord[1]);
      setTempAnnotation({
        id: 'temp',
        type: 'rect',
        box: [top,right,bottom,left]
      });
    } else if (tool === 'select') {
      if (selectedId === null) {
        return;
      }
      if (!mouseDragAction) {
        return;
      }
      const deltaX = coords[0]-startMouseCoord[0];
      const deltaY = coords[1]-startMouseCoord[1];
      if (mouseDragAction.action === 'move') {
        const selType = annotations[selectedId].type;
        switch (selType) {
          case 'point':
            setTempUpdatedSelected({
              ...annotations[selectedId],
              coords: [
                annotations[selectedId].coords[0]+deltaX,
                annotations[selectedId].coords[1]+deltaY
              ]
            });
            break;
          case 'rect':
            setTempUpdatedSelected({
              ...annotations[selectedId],
              box: [
                annotations[selectedId].box[0]+deltaY,
                annotations[selectedId].box[1]+deltaX,
                annotations[selectedId].box[2]+deltaY,
                annotations[selectedId].box[3]+deltaX
              ]
            });
            break;
        }
      } else if (mouseDragAction.action.startsWith('resize-')) {
        let action = mouseDragAction.action.substr('resize-'.length);
        let resizableDirs = {
          left: action.indexOf('w') !== -1,
          right: action.indexOf('e') !== -1,
          top: action.indexOf('n') !== -1,
          bottom: action.indexOf('s') !== -1,
        };
        let box = [...annotations[selectedId].box];
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
        setTempUpdatedSelected({
          ...annotations[selectedId],
          box: box
        });
      }
    }
  }
  function onKeyPress(event) {
    console.log('keypress');
  }

  function onClickAnnotation(key) {
    if (key === 'temp') {
      return;
    }
    if (tool !== 'select') {
      return;
    }
    setSelectedId(parseInt(key));
    setTempUpdatedSelected(annotations[key]);
  }

  // Rendering
  function renderAnnotation(ann) {
    const key = ann.id;
    let style = null;
    let classNames = ['annotation'];
    let selected = false;
    if (key === selectedId) {
      classNames.push('selected');
      selected = true;
      ann = tempUpdatedSelected;
    }
    function onClick(event) {
      onClickAnnotation(key);
    }
    switch (ann.type) {
      case 'point':
        style = {
          left: ann.coords[0],
          top: ann.coords[1],
        };
        classNames.push('point');
        return <div className={classNames.join(' ')}
          key={key}
          style={style}
          onClick={onClick}>
        </div>;
      case 'rect':
        style = {
          top: ann.box[0],
          left: ann.box[3],
          height: ann.box[2]-ann.box[0],
          width: ann.box[1]-ann.box[3],
        };
        classNames.push('rect');
        return <div className={classNames.join(' ')}
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
    { tempAnnotation && renderAnnotation(tempAnnotation) }
    <div className='controls'>
      <button onClick={()=>setTool('select')}>Select</button>
      <button onClick={()=>setTool('point')}>Point</button>
      <button onClick={()=>setTool('rect')}>Rect</button>
    </div>
  </div>;
}

export function PdfAnnotationContainer(props) {
  const [annotations, setAnnotation] = useState({});
  const nextAnnotationId = useRef(0);

  function createAnnotation(ann) {
    const id = nextAnnotationId.current++;
    console.log(annotations);
    ann['id'] = id;
    setAnnotation({
      ...annotations,
      [id]: ann
    });
  }

  function updateAnnotation(id, ann) {
    setAnnotation({
      ...annotations,
      [id]: ann
    });
  }

  function deleteAnnotation(id) {
    // TODO
  }

  return (<div className='annotation-container'>
    <div className='pdf-container'>
      <PdfViewer />
      <AnnotationLayer
          createAnnotation={createAnnotation}
          updateAnnotation={updateAnnotation}
          annotations={annotations} />
    </div>
  </div>);
}

function AnnotationTextContainer(props) {
}
