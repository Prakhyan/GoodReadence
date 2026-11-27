/* Follow the device until the reader explicitly chooses a different appearance. */
(()=>{
 if(new URLSearchParams(location.search).get('library')==='1')document.documentElement.classList.add('library-entry');
 const system=matchMedia('(prefers-color-scheme: dark)');
 const read=()=>{try{return localStorage.getItem('gr:appearance')}catch{return null}};
 const valid=value=>['light','dark'].includes(value)?value:'system';
 let preference=valid(read());
 const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',moon='<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>';
 function paint(){
  const dark=preference==='dark'||preference==='system'&&system.matches,appearance=dark?'dark':'light';document.documentElement.dataset.appearance=appearance;document.documentElement.style.colorScheme=appearance;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=dark?'#15131a':'#f7f5f2';
  const button=document.querySelector('#appearanceToggle');if(button){button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(dark?sun:moon)+'</svg>';button.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');button.title=button.getAttribute('aria-label');button.setAttribute('aria-pressed',String(dark))}
  document.dispatchEvent(new CustomEvent('gr:appearance',{detail:{preference,appearance}}));
 }
 function set(value,save=false){preference=valid(value);if(save)try{if(preference==='system')localStorage.removeItem('gr:appearance');else localStorage.setItem('gr:appearance',preference)}catch{}paint()}
 function bind(){const button=document.querySelector('#appearanceToggle');if(button)button.onclick=()=>set(document.documentElement.dataset.appearance==='dark'?'light':'dark',true);paint()}
 window.GRAppearance={set,bind,preference:()=>preference};paint();document.addEventListener('DOMContentLoaded',bind);system.addEventListener('change',()=>{if(preference==='system')paint()});addEventListener('pageshow',()=>set(read()));addEventListener('storage',event=>{if(event.key==='gr:appearance'||event.key===null)set(read())});
})();
