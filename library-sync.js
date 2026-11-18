// Refresh the private shelf when the catalogue adds a book in another tab.
(() => {
  const refresh=()=>{if(typeof loadLib==='function')loadLib()};
  window.addEventListener('pageshow',refresh);
  window.addEventListener('focus',refresh);
  try{const channel=new BroadcastChannel('goodreadence-library');channel.onmessage=e=>{if(e.data?.type==='changed')refresh()}}catch{}
  if(new URLSearchParams(location.search).get('library')==='1'){
    const intro=document.querySelector('#intro');if(intro)intro.hidden=true;
    try{localStorage.setItem('gr:introSeen','1')}catch{}
  }
})();
