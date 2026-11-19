/* Pinned, local PDF.js. Document scripts and JavaScript evaluation stay disabled. */
(()=>{
  const root=new URL('vendor/pdfjs/',document.currentScript.src);
  const ready=import(new URL('legacy/build/pdf.min.mjs',root)).then(lib=>{
    lib.GlobalWorkerOptions.workerSrc=new URL('legacy/build/pdf.worker.min.mjs',root).href;
    const getDocument=options=>lib.getDocument({...options,isEvalSupported:false,enableXfa:false,
      cMapUrl:new URL('cmaps/',root).href,cMapPacked:true,
      standardFontDataUrl:new URL('standard_fonts/',root).href,
      wasmUrl:new URL('wasm/',root).href,iccUrl:new URL('iccs/',root).href});
    window.pdfjsLib={...lib,getDocument};return window.pdfjsLib;
  });
  window.GRPDFReady=ready;
  window.pdfjsLib={getDocument:options=>({promise:ready.then(lib=>lib.getDocument(options).promise)})};
  ready.catch(()=>{const status=document.querySelector('#msg');if(status)status.textContent='The PDF engine could not load. Reopen the app online and try again.'});
})();
