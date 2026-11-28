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
  window.GRPDFFile=async file=>{const lib=await load();if(!(file instanceof Blob)||!file.size)throw Error('This PDF file is empty.');class LocalRange extends lib.PDFDataRangeTransport{constructor(){super(file.size,new Uint8Array(),true,file.name);this.stopped=false}requestDataRange(begin,end){file.slice(begin,end).arrayBuffer().then(buffer=>{if(!this.stopped){this.onDataRange(begin,new Uint8Array(buffer));this.onDataProgress?.(end,file.size)}}).catch(()=>{this.abort();this.fail?.()})}abort(){this.stopped=true}}const range=new LocalRange(),task=lib.getDocument({range,length:file.size,rangeChunkSize:262144,disableAutoFetch:true,disableStream:true});let fail;const failure=new Promise((_,reject)=>fail=reject),timer=setTimeout(()=>{fail(Error('This PDF took too long to open. Try a smaller copy or choose the original file again.'));task.destroy().catch(()=>{})},90000);range.fail=()=>{fail(Error('The selected PDF could not be read. Choose the original file again.'));task.destroy().catch(()=>{})};return {promise:Promise.race([task.promise,failure]).finally(()=>clearTimeout(timer)),destroy:()=>{clearTimeout(timer);return task.destroy()},set onPassword(value){task.onPassword=value},set onProgress(value){task.onProgress=value}}};
  window.pdfjsLib={getDocument:options=>{let task,cancelled=false,onPassword,onProgress;const promise=load().then(lib=>{if(cancelled)throw new DOMException('Opening cancelled.','AbortError');task=lib.getDocument(options);if(onPassword)task.onPassword=onPassword;if(onProgress)task.onProgress=onProgress;return task.promise});return{promise,destroy(){cancelled=true;return task?task.destroy():Promise.resolve()},set onPassword(value){onPassword=value;if(task)task.onPassword=value},set onProgress(value){onProgress=value;if(task)task.onProgress=value}}}};
})();
