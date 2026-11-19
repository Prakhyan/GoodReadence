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
  const requested=new URLSearchParams(location.search).get('open');
  if(requested&&/^\d+$/.test(requested)){
    const openRequested=async()=>{
      await loadLib();
      const entry=lib.find(book=>String(book.catalogId)===requested);
      if(entry){const url=new URL(location.href);url.searchParams.delete('open');history.replaceState(null,'',url);await openBook(entry)}
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',openRequested,{once:true});else openRequested();
  }
})();
