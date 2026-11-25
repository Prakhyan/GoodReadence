/* Keep installed GoodReadence copies current whenever a network connection is available. */
(()=>{
  const worker=navigator.serviceWorker;
  if(!worker||!(location.protocol==='https:'||location.hostname==='127.0.0.1'||location.hostname==='localhost'))return;
  const hadController=!!worker.controller;
  let reloading=false;
  worker.addEventListener('controllerchange',()=>{
    if(hadController&&!reloading){const reloadWhenReady=()=>{if(window.GRImport?.busy){setTimeout(reloadWhenReady,1000);return}reloading=true;location.reload()};reloadWhenReady()}
  });
  const showVersion=async()=>{
    try{
      const response=await fetch(new URL('/release.json',location.origin),{cache:'no-store'});
      if(!response.ok)return;
      const release=await response.json();
      if(release.version)document.querySelectorAll('[data-app-version]').forEach(node=>node.textContent=release.version);
    }catch(_){/* Keep the last displayed version while offline. */}
  };
  let registration;
  const prepare=()=>window.GRWorkerRegistration||(window.GRWorkerRegistration=new Promise((resolve,reject)=>{const register=()=>worker.register('/audio-cache.js').then(resolve,reject);if(worker.controller)register();else{const idle=()=>setTimeout(register,1500);if(document.readyState==='complete')idle();else addEventListener('load',idle,{once:true})}}));
  const check=async()=>{
    if(!navigator.onLine)return;
    try{
      registration=registration||await worker.getRegistration()||await prepare();
      await registration.update();
      await showVersion();
    }catch(_){/* The cached app remains available when the network is unavailable. */}
  };
  prepare().then(reg=>{registration=reg;check()}).catch(()=>{});
  window.addEventListener('online',check);
  window.addEventListener('focus',check);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
  window.setInterval(check,5*60*1000);
})();
