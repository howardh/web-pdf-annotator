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
  return (<div className='pdf-viewer__loading-layer'>
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
      <canvas className='pdf-viewer__main-layer' ref={ref}></canvas>
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
    'pdf-viewer__text-layer': true,
  })
  return (
    <div className={classNames} ref={ref}></div>
  );
}

function TextLayer(props) {
  const {
    page,
    scale,
    shouldBeRendered,
  } = props;

  const ref = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [textContent, setTextContent] = useState(null);

  // Render PDF
  const getContentTaskRef = useRef(null);
  const renderTaskRef = useRef(null);
  useEffect(() => {
    if (!page) {
      return;
    }
    if (getContentTaskRef.current) {
      return; // Don't load twice simultaneously
    }

    let task = page.getTextContent();
    getContentTaskRef.current = task;
    task.then(content => {
      setTextContent(content);
      getContentTaskRef.current = null;
    });
  }, [page]);

  useEffect(() => {
    if (!ref.current) {
      setCtx(null);
    } else {
      setCtx(ref.current.getContext('2d'));
    }
  }, [ref.current]);

  let viewport = page.getViewport({ scale: scale });

  let classNames = generateClassNames({
    'pdf-viewer__text-layer-custom': true,
  });
  return (
    <div className={classNames}>
      <canvas ref={ref} />
      {
        textContent &&
        textContent.items.map((item,index) => {
          if (item.transform[1] !== 0 || item.transform[2] !== 0) {
            // Ignore rotated text for now. I don't know how to handle these.
            return null;
          }

          let fontFamily = textContent.styles[item.fontName].fontFamily;
          let fontSize = (item.height)*scale;
          let fontAscent = textContent.styles[item.fontName].ascent*fontSize;
          let fontDescent = textContent.styles[item.fontName].descent*fontSize;

          let left = item.transform[4]*scale;
          let top = viewport.height-(item.transform[5]+item.height)*scale-fontDescent;
          let width = item.width*scale;
          let height = item.height*scale;

          let transform = null;
          let actualWidth = null;
          if (ctx) {
            ctx.font = `normal ${fontSize}px ${fontFamily}`;
            let textSize = ctx.measureText(item.str);
            actualWidth = textSize.width;
            transform = 'scaleX('+(width/textSize.width)+')';
          }

          let style = {
            left, top, fontSize, fontFamily, transform
          };
          return <span style={style} key={index} data-actual-width={actualWidth}>{item.str}</span>;
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
    scrollToDest,
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

  let classNames = generateClassNames({
    'pdf-viewer__annotation-layer': true,
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
          return (<div className='pdf-viewer__annotation' style={style} onClick={()=>scrollToDest(ann.dest)}></div>);
        })
      }
    </div>
  );
}

function PdfPageContainer(props) {
  const {
    pdf,
    page,
    textLayerOnTop,
    shouldBeRendered,
    customLayers,
    scale,
    scrollToDest,
  } = props;

  let viewport = page.getViewport({ scale: scale, });
  let style = {
    height: viewport.height,
    width: viewport.width,
  };

  return (
    <div className='pdf-viewer__page-container' style={style}>
      {
        shouldBeRendered ? (
          textLayerOnTop ? (
            <>
              <MainLayer key='main'
                  page={page}
                  pdf={pdf}
                  scale={scale}
                  shouldBeRendered={shouldBeRendered} />
              {
                customLayers &&
                customLayers({page, scale})
              }
              <TextLayer key='text'
                  page={page}
                  pdf={pdf}
                  scale={scale}
                  shouldBeRendered={shouldBeRendered} />
              <AnnotationLayer key='annotation'
                  page={page}
                  pdf={pdf}
                  scale={scale}
                  shouldBeRendered={shouldBeRendered}
                  scrollToDest={scrollToDest} />
            </>
          ) : (
            <>
              <MainLayer key='main'
                  page={page}
                  pdf={pdf}
                  scale={scale}
                  shouldBeRendered={shouldBeRendered} />
              <TextLayer key='text'
                  page={page}
                  pdf={pdf}
                  scale={scale}
                  shouldBeRendered={shouldBeRendered} />
              <AnnotationLayer key='annotation'
                  page={page}
                  pdf={pdf}
                  scale={scale}
                  shouldBeRendered={shouldBeRendered}
                  scrollToDest={scrollToDest} />
              {
                customLayers &&
                customLayers({page, scale})
              }
            </>
          )
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
  const scrollDest = useSemiState(null,false);

  useEffect(() => { // Translate scrollDest to scrollState
    if (!scrollDest.value || !scrollDest.changed) {
      return;
    }
    if (!pagesLoadingProgress) {
      return;
    }
    if (pagesLoadingProgress.totalPages !== pagesLoadingProgress.loadedPages) {
      return;
    }
    pdf.getDestination(scrollDest.value).then(
      explicitDest => {
        pdf.getPageIndex(explicitDest[0]).then(pageIndex => {
          let viewport = pages[pageIndex].getViewport({ scale: 1, });
          let x = explicitDest[2]*scale;
          let y = (viewport.height-explicitDest[3])*scale;
          scrollState.setValue({page: pageIndex, x, y})
          scrollDest.done();
        });
      }
    );
  },[pdf,pages,pagesLoadingProgress,scrollDest.changed]);

  return {
    pdf, pages, pagesLoadingProgress, pagesLoadingError,
    scrollState,
    scale, setScale,
    visiblePageRange, setVisiblePageRange,
    scrollTo: (pos) => scrollState.setValue(pos),
    scrollToPage: (pageIndex) => scrollState.setValue({page: pageIndex}),
    scrollToDest: (dest) => scrollDest.setValue(dest),
  };
}

function PdfViewer(props, forwardRef) {
  const {
    state,
    textLayerOnTop,
    customLayers=null,
  } = props;

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
    let scrollTopMax = ref.current.scrollHeight - ref.current.clientHeight;
    ref.current.scrollTo(0,scrollTopMax * scrollPos.current);
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
    let scrollPercent = e.target.scrollTop/(e.target.scrollHeight-window.innerHeight);
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
            textLayerOnTop={textLayerOnTop}
            shouldBeRendered={i >= state.visiblePageRange[0] && i <= state.visiblePageRange[1]}
            customLayers={customLayers}
            scrollToDest={state.scrollToDest}
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
