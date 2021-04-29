import React from 'react';
import { useEffect, useState, useRef, useCallback, useContext, useMemo, useImperativeHandle } from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { useParams, useLocation, useHistory } from "react-router-dom";
import { createSelector } from 'reselect';
import * as pdfjsLib from 'pdfjs-dist/webpack';

import { Button, TextField, Checkbox, GroupedInputs, Tooltip } from './Inputs.js';
import TextEditor from './TextEditor';
import { NoteViewer } from './NoteEditor.js';
import {
  clip,filterDict,generateClassNames,formChangeHandler,parseQueryString,useSemiState
} from './Utils.js';
import {
  documentActions,annotationActions,noteActions
} from './actions/index.js';

import './PdfViewer.scss';

function usePdfPages(doc) {
  const [pdf,setPdf] = useState(null);
  const [pages,setPages] = useState([]);
  const [progress,setProgress] = useState(null);
  const [error,setError] = useState(null);
  const docId = doc && doc.id;

  const pdfRef = useRef(null);
  useEffect(()=>{
    pdfRef.current = pdf;
  }, [pdf]);
  const pagesRef = useRef([]);
  useEffect(()=>{
    pagesRef.current = pages;
  }, [pages]);

  const taskRef = useRef(null);
  useEffect(()=>{
    if (docId === null || docId === undefined) {
      return;
    }
    let loadingTask = pdfjsLib.getDocument({
      url: process.env.REACT_APP_SERVER_ADDRESS+"/data/documents/"+docId+'/pdf',
      withCredentials: true
    })
    loadingTask.onProgress = ({loaded, total}) => {
      //console.log('loaded '+(loaded/total*100)+'%')
    };
    taskRef.current = loadingTask;
    loadingTask.promise.then(pdf => {
      taskRef.current = null;
      setPages(new Array(pdf.numPages));
      setProgress({
        totalPages: pdf.numPages,
        loadedPages: 0
      });
      setPdf(pdf);
      window.pdf = pdf;
    }).catch(error => {
      console.error(error);
      taskRef.current = null;
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError(error.message || "Error Loading PDF");
      }
    });
    return ()=>{
      if (taskRef.current) {
        taskRef.current.destroy();
      } else {
        for (let page of pagesRef.current) {
          if (page) {
            page.cleanup();
          }
        }
      }
    }
  },[docId]);
  useEffect(()=>{
    if (!pdf) {
      return;
    }
    if (progress.loadedPages === pdf.numPages) {
      return; // Hack for live-reload. Without this, the pages will be loaded twice each time the page is hot-reloaded.
    }
    for (let i = 1; i <= pdf.numPages; i++) {
      pdf.getPage(i).then(p => {
        setPages(pages => {
          let output = pages.slice();
          output[i-1] = p;
          return output;
        });
        setProgress(progress => {
          return {
            ...progress,
            loadedPages: progress.loadedPages + 1
          };
        });
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

function LoadingLayer(props) {
  return (<div className='loading-layer'>
    <span>Loading...</span>
  </div>);
}

function MainLayer(props) {
  const {
    page,
    shouldBeRendered,
    scale,
  } = props;

  const ref = useRef(null);

  // Save the scale that was used for the last render. This is needed in case the user zooms more than once in quick succession, and only only the render triggered by the first zoom goes through.
  const [lastRenderedScale, setLastRenderedScale] = useState(null);
  useEffect(() => {
    // Ensures that we render the new page, because we check if the scale changed between renders
    setLastRenderedScale(null);
  }, [page, shouldBeRendered]);

  // Render PDF
  const taskRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !page) {
      return;
    }
    if (taskRef.current) {
      return; // Don't start multiple rendering tasks
    }
    if (scale === lastRenderedScale) {
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
    window.rc = renderContext;
    let task = page.render(renderContext);
    taskRef.current = task;
    task.promise.then(x => {
      taskRef.current = null;
      setLastRenderedScale(scale);
    }).catch(error => {
      taskRef.current = null;
      console.error(error);
    });
  }, [page, scale, shouldBeRendered, lastRenderedScale]);

  if (!shouldBeRendered) {
    return null;
  } else {
    return (
      <canvas ref={ref}></canvas>
    );
  }
}

function TextLayer2(props) {
  const {
    page,
    scale,
    shouldBeRendered,
  } = props;

  const ref = useRef(null);

  // Save the scale that was used for the last render. This is needed in case the user zooms more than once in quick succession, and only only the render triggered by the first zoom goes through.
  const [lastRenderedScale, setLastRenderedScale] = useState(null);
  useEffect(() => {
    // Ensures that we render the new page, because we check if the scale changed between renders
    setLastRenderedScale(null);
  }, [page, shouldBeRendered]);

  // Render PDF
  const getContentTaskRef = useRef(null);
  const renderTaskRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !page) {
      return;
    }
    if (getContentTaskRef.current || renderTaskRef.current) {
      return; // Don't start multiple rendering tasks
    }
    if (!shouldBeRendered) {
      return;
    }
    if (scale === lastRenderedScale) {
      return;
    }

    ref.current.innerHTML = ''; // Clear existing text

    let viewport = page.getViewport({ scale: scale });

    let task = page.getTextContent();
    getContentTaskRef.current = task;
    task.then(content => {
      getContentTaskRef.current = null;
      var renderContext = {
        textContent: content,
        viewport: viewport,
        container: ref.current,
        textDivs: []
      };
      try {
        let task = pdfjsLib.renderTextLayer(renderContext);
        renderTaskRef.current = task;
        task.promise.then(x => {
          renderTaskRef.current = null;
          setLastRenderedScale(scale);
        }).catch(error => {
          renderTaskRef.current = null;
          console.error(error);
        });
      } catch(error) {
        // A TypeError will occur if the above code is still running when this component is unmounted.
        // The container div will no longer exist, if that happens, but is still used above in a callback.
        console.error(error);
      }
    });
  }, [page, scale, shouldBeRendered, lastRenderedScale]);

  let classNames = generateClassNames({
    'text-layer': true,
  })
  return (
    <div className={classNames} ref={ref}></div>
  );
}

const nonWhitespaceRegexp = /\S/;
function isAllWhitespace(str) {
  return !nonWhitespaceRegexp.test(str);
}

const DEFAULT_FONT_SIZE = 30;
const DEFAULT_FONT_ASCENT = 0.8;
const ascentCache = new Map();
function getAscent(fontFamily, ctx) {
  const cachedAscent = ascentCache.get(fontFamily);
  if (cachedAscent) {
    return cachedAscent;
  }

  ctx.save();
  ctx.font = `${DEFAULT_FONT_SIZE}px ${fontFamily}`;
  const metrics = ctx.measureText("");

  // Both properties aren't available by default in Firefox.
  let ascent = metrics.fontBoundingBoxAscent;
  let descent = Math.abs(metrics.fontBoundingBoxDescent);
  if (ascent) {
    ctx.restore();
    const ratio = ascent / (ascent + descent);
    ascentCache.set(fontFamily, ratio);
    return ratio;
  }

  // Try basic heuristic to guess ascent/descent.
  // Draw a g with baseline at 0,0 and then get the line
  // number where a pixel has non-null red component (starting
  // from bottom).
  ctx.strokeStyle = "red";
  ctx.clearRect(0, 0, DEFAULT_FONT_SIZE, DEFAULT_FONT_SIZE);
  ctx.strokeText("g", 0, 0);
  let pixels = ctx.getImageData(0, 0, DEFAULT_FONT_SIZE, DEFAULT_FONT_SIZE)
    .data;
  descent = 0;
  for (let i = pixels.length - 1 - 3; i >= 0; i -= 4) {
    if (pixels[i] > 0) {
      descent = Math.ceil(i / 4 / DEFAULT_FONT_SIZE);
      break;
    }
  }

  // Draw an A with baseline at 0,DEFAULT_FONT_SIZE and then get the line
  // number where a pixel has non-null red component (starting
  // from top).
  ctx.clearRect(0, 0, DEFAULT_FONT_SIZE, DEFAULT_FONT_SIZE);
  ctx.strokeText("A", 0, DEFAULT_FONT_SIZE);
  pixels = ctx.getImageData(0, 0, DEFAULT_FONT_SIZE, DEFAULT_FONT_SIZE).data;
  ascent = 0;
  for (let i = 0, ii = pixels.length; i < ii; i += 4) {
    if (pixels[i] > 0) {
      ascent = DEFAULT_FONT_SIZE - Math.floor(i / 4 / DEFAULT_FONT_SIZE);
      break;
    }
  }

  ctx.restore();

  if (ascent) {
    const ratio = ascent / (ascent + descent);
    ascentCache.set(fontFamily, ratio);
    return ratio;
  }

  ascentCache.set(fontFamily, DEFAULT_FONT_ASCENT);
  return DEFAULT_FONT_ASCENT;
}

function TextLayer(props) {
  const {
    page,
    scale,
    shouldBeRendered,
  } = props;

  const ref = useRef(null);

  // Content
  const [textContent, setTextContent] = useState(null);
  const [textRenderParams, setTextRenderParams] = useState(null);
  let viewport = page.getViewport({ scale: scale });

  // Render PDF
  const getContentTaskRef = useRef(null);
  useEffect(() => {
    if (!page) {
      return;
    }
    if (getContentTaskRef.current) {
      return;
    }

    let task = page.getTextContent();
    getContentTaskRef.current = task;
    task.then(content => {
      setTextContent(content);
      getContentTaskRef.current = null;
    });
  }, [page]);

  // Compute rendering parameters
  useEffect(() => {
    let ctx = ref.current?.getContext("2d", { alpha: false });
    if (!textContent || !ctx) {
      return;
    }
    setTextRenderParams(
      textContent.items.map((geom,i) => {
        // See https://github.com/mozilla/pdf.js/blob/0acd801b1e66c52f6c9a5bae2486f4865277d5aa/src/display/text_layer.js#L130
        // See https://gist.github.com/hubgit/600ec0c224481e910d2a0f883a7b98e3
        const textDivProperties = {
          angle: 0,
          canvasWidth: 0,
          isWhitespace: false,
          originalTransform: null,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          paddingTop: 0,
          scale: 1,
        };
        const divStyle = {};

        if (isAllWhitespace(geom.str)) {
          return null;
        }

        let tx = pdfjsLib.Util.transform(
          viewport.transform, geom.transform
        );
        let angle = Math.atan2(tx[1], tx[0]);
        const style = textContent.styles[geom.fontName];
        if (style.vertical) {
          angle += Math.PI / 2;
        }
        const fontHeight = Math.hypot(tx[2], tx[3]);
        const fontAscent = fontHeight * getAscent(style.fontFamily, ctx);
        //const fontAscent = fontHeight;

        let left, top;
        //if (angle === 0) {
        //  //left = tx[4];
        //  //top = tx[5] - fontAscent;
        //  tx[4] = tx[4];
        //  tx[5] = tx[5] - fontAscent;
        //} else {
        //  //left = tx[4] + fontAscent * Math.sin(angle);
        //  //top = tx[5] - fontAscent * Math.cos(angle);
        //  tx[4] = tx[4] + fontAscent * Math.sin(angle);
        //  tx[5] = tx[5] - fontAscent * Math.cos(angle);
        //}
        // Setting the style properties individually, rather than all at once,
        // should be OK since the `textDiv` isn't appended to the document yet.
        divStyle.left = 0;
        divStyle.top = 0;
        //divStyle.left = `${left}px`;
        //divStyle.top = `${top}px`;
        divStyle.fontSize = `${tx[0]}px`;
        divStyle.fontFamily = style.fontFamily;

        let tx2 = [...tx];
        let scaleX = 1;
        let scaleY = 1;
        let descent = 0;
        scaleX /= tx[0];
        scaleY /= tx[0];
        if (geom.width > 0) {
          ctx.font = tx[0] + 'px ' + style.fontFamily;
          let measurement = ctx.measureText(geom.str);
          let width = measurement.width;
          //let height = measurement.actualBoundingBoxAscent+measurement.actualBoundingBoxDescent;
          let height = measurement.actualBoundingBoxAscent;
          descent = measurement.actualBoundingBoxDescent;
          console.log([i,height,descent,ctx.font]);
          if (width > 0) {
            scaleX  *= geom.width/width;
          }
          if (height > 0) {
            //scaleY  *= (geom.height-descent)/height;
            scaleY  *= geom.height/height;
          }
          //if (angle === 0) {
          //  tx[5] = tx[5] + descent;
          //} else {
          //  tx[5] = tx[5] + descent * Math.cos(angle);
          //}
        }
        //divStyle.transform = `scaleX(${scaleX})`;
        //tx = pdfjsLib.Util.transform(
        //  tx, [1,0,0,1,0,descent]
        //);
        tx = pdfjsLib.Util.transform(
          tx, [scaleX*scale,0,0,scaleY*scale,0,0]
        );
        divStyle.transform = `matrix(${tx.join(',')})`;

        if (page._pageIndex === 0 && i === 0) {
          window.t = {
            tx, geom, textContent, ctx,
            font: style.fontFamily,
            measureText: ctx.measureText(geom.str),
          };
        }

        return {
          str: geom.str,
          style: divStyle
        };
      })
    );
  }, [textContent, scale]);

  let classNames = generateClassNames({
    'text-layer': true,
  })
  return (
    <div className={classNames}>
      <canvas ref={ref} />
      {
        textRenderParams &&
        textRenderParams.map(({str,style},i) => {
          return <span style={style} role='presentation' key={i}>
            {str}
          </span>;
        })
      }
    </div>
  );
}

function AnnotationLayer(props) {
  const {
    pdf,
    page,
    scale,
    hidden=false,
    shouldBeRendered,
    scrollState,
  } = props;

  const ref = useRef(null);

  let viewport = page.getViewport({ scale: 1, });
  let style = {
    height: viewport.height,
    width: viewport.width,
  };

  // Render PDF
  const [annotations, setAnnotations] = useState([]);
  useEffect(() => {
    if (!page) { return; }
    page.getAnnotations().then((annotations) => {
      window.a = window.a || {};
      window.a[page._pageIndex] = annotations;
      setAnnotations(annotations);
    });
  }, [page]);

  // Follow ref link
  function goToDest(dest) {
    if (!dest) {
      console.error('invalid dest');
      return;
    }
    pdf.getDestination(dest).then(
      explicitDest => {
        pdf.getPageIndex(explicitDest[0]).then(pageIndex => {
          let x = explicitDest[2]*scale;
          let y = (viewport.height-explicitDest[3])*scale;
          scrollState.setValue({page: pageIndex, x, y})
        });
      }
    );
  }

  let classNames = generateClassNames({
    'annotation-layer': true,
  })
  return (
    <div className={classNames} ref={ref}>
      {
        annotations.map(ann => {
          let rect = ann.rect;
          let left = rect[0];
          let height = rect[3]-rect[1];
          let width = rect[2]-rect[0];
          let top = viewport.height-rect[1]-height;
          let style = {
            border: '1px solid',
            left, top, height, width,
            borderColor: 'rgb('+ann.color.join(',')+')',
            transform: `matrix(${scale},0,0,${scale},0,0)`,
            transformOrigin: `-${left}px -${top}px 0`,
          };
          return (<div style={style} onClick={()=>goToDest(ann.dest)}></div>);
        })
      }
    </div>
  );
}

function PdfPageContainer(props) {
  const {
    pdf,
    page,
    shouldBeRendered,
    customLayers,
    scale,
    scrollState,
  } = props;

  let viewport = page.getViewport({ scale: scale, });
  let style = {
    height: viewport.height,
    width: viewport.width,
  };

  return (
    <div className='pdf-page-container' style={style}>
      {
        shouldBeRendered ? (
          <>
            <MainLayer page={page}
                pdf={pdf}
                scale={scale}
                shouldBeRendered={shouldBeRendered} />
            <TextLayer page={page}
                pdf={pdf}
                scale={scale}
                shouldBeRendered={shouldBeRendered} />
            <AnnotationLayer page={page}
                pdf={pdf}
                scale={scale}
                shouldBeRendered={shouldBeRendered}
                scrollState={scrollState} />
            {
              customLayers &&
              customLayers({page, scale})
            }
          </>
        ) : (
          <LoadingLayer page={page}
              pdf={pdf}
              scale={scale}
              shouldBeRendered={shouldBeRendered} />
        )
      }
    </div>
  );
};

function createScrollEvent(val) {
  return {
    firstVisiblePageIndex: 0,
    lastVisiblePageIndex: 0,
    ...val
  };
}

export function usePdfViewerState(doc) {
  const {
    pdf,
    pages,
    progress:pagesLoadingProgress,
    error:pagesLoadingError
  } = usePdfPages(doc);

  const [scale, setScale] = useState(1);
  const [visiblePageRange, setVisiblePageRange] = useState([0,0]);
  const scrollState = useSemiState(null,false);

  return {
    pdf, pages, pagesLoadingProgress, pagesLoadingError,
    scrollState,
    scale, setScale,
    visiblePageRange, setVisiblePageRange,
    scrollTo: (pos) => scrollState.setValue(pos),
    scrollToPage: (pageIndex) => scrollState.setValue({page: pageIndex}),
  };
}

function PdfViewer(props, forwardRef) {
  const {
    state,
    customLayers=null,
  } = props;

  window.state = state;

  const ref = useRef(null);

  // Scroll request
  const scrollState = state.scrollState;
  useEffect(() => {
    if (!scrollState.changed) {
      return;
    }
    const { page, x, y } = scrollState.value;
    if (page) {
      let children = ref.current.children;
      if (page >= children.length) {
        console.log('Page out of range.');
        return;
      }
      children[page].scrollIntoView();
      if (x && y) {
        ref.current.scrollBy(x,y);
      }
    } else {
      ref.current.scrollTo(x,y);
    }
    scrollState.done();
  }, [scrollState.changed, state.pagesLoadingProgress]);

  // Zoom
  const scrollPos = useRef(null);
  useEffect(() => { // Ensure scroll position stays the same after zoom
    if (!ref.current) {
      return;
    }
    ref.current.scrollTo(0,ref.current.scrollTopMax * scrollPos.current);
  }, [state.scale]);

  // Pages in view
  function elementInViewport(el) {
    // Return 0 if the element is in the viewport, -1 if the element is before the viewport, and 1 if it comes after the viewport.
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight) { return 1; }
    if (rect.bottom < 0) { return -1; }
    return 0;
  }
  function handleScroll(e) {
    let scrollPercent = e.target.scrollTop/e.target.scrollTopMax;
    scrollPos.current = scrollPercent; // Save position
    let children = ref.current.children;
    let i = Math.min(
      Math.floor(children.length*scrollPercent),
      children.length-1
    );
    while (true) {
      let child = children[i];
      let relPos = elementInViewport(child);
      if (relPos === 0) {
        // Find last visible element
        let last=i;
        for (let j=i; j < children.length; j++) {
          if (elementInViewport(children[j]) === 0) {
            last = j;
          } else {
            break;
          }
        }
        // Find first visible element
        let first=i;
        for (let j=i; j >= 0; j--) {
          if (elementInViewport(children[j]) === 0) {
            first = j;
          } else {
            break;
          }
        }
        // Pages to render
        state.setVisiblePageRange([first,last]);
        break;
      } else {
        i += relPos;
        if (i < 0 || i >= children.length) {
          break;
        }
      }
    }
  }

  return (
    <div className='pdf-viewer' ref={ref} onScroll={handleScroll} tabIndex={-1}>
      {
        state.pagesLoadingProgress &&
        state.pagesLoadingProgress.loadedPages !== state.pagesLoadingProgress.totalPages &&
        <div><span>Loading {Math.floor(state.pagesLoadingProgress.loadedPages/state.pagesLoadingProgress.totalPages*100)}%</span></div>
      }
      {state.pages.map(function(page,i){
        return <PdfPageContainer key={page._pageIndex}
            scale={state.scale}
            pdf={state.pdf}
            page={page}
            shouldBeRendered={i >= state.visiblePageRange[0] && i <= state.visiblePageRange[1]}
            customLayers={customLayers}
            scrollState={state.scrollState}
            />
      })}
    </div>
  );
}

function FullPdfViewer(props) {
  // "Full-featured" PDF viewers
  const {
    doc,
  } = props;

  const pdfViewerState = usePdfViewerState(doc);

  function handleKeyDown(e) {
    if (e.key === '+') {
      pdfViewerState.setScale(s => Math.min(s+0.2,3));
    }
    if (e.key === '-') {
      pdfViewerState.setScale(s => Math.max(s-0.2,0.4));
    }
  }

  return (<div className='full-pdf-viewer'
      tabIndex={-1}
      onKeyDown={handleKeyDown}>
    <PdfViewer state={pdfViewerState} />
  </div>);
}

export default function PdfViewerPage(props) {
  const {
    docId
  } = useParams();
  const dispatch = useDispatch();
  const doc = useSelector(state => state.documents.entities[docId]);

  useEffect(()=>{
    if (!docId) {
      return;
    }
    // Fetch document and all associated entities (annotations, notes)
    dispatch(documentActions['fetchSingle'](docId,'recursive'));
  },[docId]);

  return (
    <FullPdfViewer doc={doc} />
  );
}

export {
  PdfViewer
};
