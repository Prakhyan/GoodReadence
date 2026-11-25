/* Pinned, local PDF.js. Document scripts and JavaScript evaluation stay disabled. */
(()=>{
  const root=new URL('vendor/pdfjs/',document.currentScript.src);
  let ready;
  function load(){return ready||(ready=import(new URL('legacy/build/pdf.min.mjs',root)).then(lib=>{
    lib.GlobalWorkerOptions.workerSrc=new URL('legacy/build/pdf.worker.min.mjs',root).href;
    const getDocument=options=>lib.getDocument({...options,isEvalSupported:false,enableXfa:false,
      cMapUrl:new URL('cmaps/',root).href,cMapPacked:true,
      standardFontDataUrl:new URL('standard_fonts/',root).href,
      wasmUrl:new URL('wasm/',root).href,iccUrl:new URL('iccs/',root).href});
    window.pdfjsLib={...lib,getDocument};return window.pdfjsLib;
  }).catch(error=>{ready=null;const status=document.querySelector('#msg');if(status)status.textContent='The PDF engine could not load. Reopen the app online and try again.';throw error}))}
  Object.defineProperty(window,'GRPDFReady',{get:load});
  window.pdfjsLib={getDocument:options=>{let task,cancelled=false,onPassword,onProgress;const promise=load().then(lib=>{if(cancelled)throw new DOMException('Opening cancelled.','AbortError');task=lib.getDocument(options);if(onPassword)task.onPassword=onPassword;if(onProgress)task.onProgress=onProgress;return task.promise});return{promise,destroy(){cancelled=true;return task?task.destroy():Promise.resolve()},set onPassword(value){onPassword=value;if(task)task.onPassword=value},set onProgress(value){onProgress=value;if(task)task.onProgress=value}}}};
})();
