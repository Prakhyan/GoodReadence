(() => {
  function filter(){const query=document.querySelector('#classicSearch').value.trim().toLowerCase(),genre=document.querySelector('#classicGenre').value;let count=0;for(const card of document.querySelectorAll('.classic-card')){card.hidden=!!((genre&&card.dataset.genre!==genre)||(query&&!card.dataset.search.includes(query)));if(!card.hidden)count++}document.querySelector('#classicCount').textContent=count+' '+(count===1?'book':'books');document.querySelector('#noClassics').hidden=count!==0}
  document.querySelector('#classicSearch').oninput=filter;document.querySelector('#classicGenre').onchange=filter;
})();
