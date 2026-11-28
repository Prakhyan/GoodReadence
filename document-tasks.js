(()=>{'use strict';window.GRDocumentTask=(task,files,options={})=>new Promise((resolve,reject)=>{
 const worker=new Worker('/document-worker.js'),abort=()=>{worker.terminate();reject(new DOMException('Cancelled. Your files are unchanged.','AbortError'))},finish=()=>{worker.terminate();options.signal?.removeEventListener('abort',abort)};
 options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted){abort();return}
 worker.onmessage=({data})=>{if(data.error){finish();reject(Error(data.error))}else if(data.progress)options.progress?.(data.progress);else{finish();resolve(data)}};worker.onerror=()=>{finish();reject(Error('This device could not finish the file. Try fewer files or a smaller copy.'))};worker.postMessage({task,files,range:options.range,blob:options.blob});
})})();
