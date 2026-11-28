import assert from 'node:assert/strict';
import {mergeStates,stable} from '../cloud/sync/merge.js';
import {validateState,CloudError,MAX_BOOK} from '../cloud/types/CloudStorageProvider.js';
import {GoogleDriveProvider} from '../cloud/providers/GoogleDriveProvider.js';
import {DropboxProvider} from '../cloud/providers/DropboxProvider.js';
import {OneDriveProvider} from '../cloud/providers/OneDriveProvider.js';
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
const hash='a'.repeat(64),book=(clock,time,note)=>({id:'book',hash,size:3,mime:'application/pdf',filename:'book.pdf',lastModified:time,metadata:{id:'book',name:'A book',n:10,grClock:clock,grModifiedAt:time,notes:{0:note}}}),state=(device,b)=>({kind:'goodreadence-library',schema:2,deviceId:device,updatedAt:1,books:{book:b}});
const a=state('a',book({a:2},100,'Laptop notes')),b=state('b',book({a:1,b:1},200,'Phone notes'));
const merged=await mergeStates([a,b],'test'),reverse=await mergeStates([b,a],'test');assert.equal(stable(merged.books),stable(reverse.books));assert.equal(Object.keys(merged.books).length,2);assert.deepEqual(new Set(Object.values(merged.books).map(b=>b.metadata.notes[0])),new Set(['Laptop notes','Phone notes']));assert.equal(Object.keys((await mergeStates([merged,a,b],'test')).books).length,2);
const causal=await mergeStates([state('b',book({a:2,b:1},1,'Later despite a slow clock')),a],'test');assert.equal(Object.keys(causal.books).length,1);assert.equal(causal.books.book.metadata.notes[0],'Later despite a slow clock');assert.throws(()=>validateState({...a,books:{book:{...a.books.book,hash:'../../private'}}}));assert.throws(()=>validateState({...a,books:{book:{...a.books.book,size:MAX_BOOK+1}}}));
console.log('PASS causal merge, concurrent note preservation, deterministic/idempotent conflict copies, clock skew and malformed metadata.');
const payload=new Blob(Array.from({length:100},()=>new Uint8Array(1024*1024))),originalFetch=globalThis.fetch;
for(const Provider of [GoogleDriveProvider,DropboxProvider,OneDriveProvider]){
 const provider=new Provider('public-test-id');provider.auth.connect=async()=>({id:'test-account',displayName:provider.id,provider:provider.id});provider.auth.bearer=()=> 'test-token';let offset=0,maxChunk=0,session=false,simulatedRetry=false,progress=[];
 globalThis.fetch=async(raw,init={})=>{const url=new URL(raw),headers=new Headers(init.headers);assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');if(url.hostname==='test.1drv.com')assert.equal(headers.has('Authorization'),false);else assert.equal(headers.get('Authorization'),'Bearer test-token');
  const json=(v,status=200,h={})=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json',...h}});
  if(provider.id==='google'){
   if(url.pathname.endsWith('/about'))return json({user:{permissionId:'account-A'}});
   if(url.pathname==='/drive/v3/files'&&init.method!=='POST')return json({files:[{id:'folder-A'}]});
   if(url.pathname.startsWith('/upload/drive/')){session=true;assert.equal(JSON.parse(init.body).parents[0],'folder-A');return json({},200,{Location:'https://www.googleapis.com/upload/session'})}
   if(url.pathname==='/upload/session'){const m=headers.get('Content-Range').match(/bytes (\d+)-(\d+)\/(\d+)/);assert.equal(+m[1],offset);maxChunk=Math.max(maxChunk,init.body.size);assert.equal(+m[2]+1-offset,init.body.size);offset=+m[2]+1;return offset===payload.size?json({id:'file',name:'book-'+hash+'.bin',version:'1'}):json({},308,{Range:'bytes=0-'+(offset-1)})}
  }
  if(provider.id==='dropbox'){
   if(url.pathname.endsWith('list_folder'))return json({entries:[],has_more:false});
   const arg=JSON.parse(headers.get('Dropbox-API-Arg'));maxChunk=Math.max(maxChunk,init.body.size);
   if(url.pathname.endsWith('/start')){session=true;offset=init.body.size;return json({session_id:'session'})}
   assert.equal(arg.cursor.session_id,'session');assert.equal(arg.cursor.offset,offset);if(!simulatedRetry){simulatedRetry=true;return json({error:{'.tag':'incorrect_offset',correct_offset:offset}},409)}offset+=init.body.size;if(url.pathname.endsWith('/finish')){assert.equal(arg.commit.autorename,false);return json({path_lower:arg.commit.path,name:arg.commit.path.slice(1),rev:'1'})}return new Response(null,{status:200});
  }
  if(provider.id==='onedrive'){
   if(url.pathname.endsWith('/approot'))return json({id:'app-folder'});
   if(url.pathname.endsWith('/children'))return json({value:[]});
   if(url.pathname.endsWith('/createUploadSession')){session=true;return json({uploadUrl:'https://test.1drv.com/upload'})}
   if(url.hostname==='test.1drv.com'){const m=headers.get('Content-Range').match(/bytes (\d+)-(\d+)\/(\d+)/);assert.equal(+m[1],offset);maxChunk=Math.max(maxChunk,init.body.size);offset=+m[2]+1;return offset===payload.size?json({id:'file',name:'book-'+hash+'.bin',eTag:'v1'},201):json({nextExpectedRanges:[offset+'-']},202)}
  }
  throw Error('Unexpected request: '+url.pathname);
 };
 await provider.connect();await provider.readLibraryState();await provider.uploadBookFile(hash,payload,p=>progress.push(p));assert(session);assert.equal(offset,payload.size);assert(maxChunk<=8*1024*1024);assert.equal(progress.at(-1),100);await assert.rejects(()=>provider.uploadBookFile('invalid',new Blob(['x'])),CloudError);
 globalThis.fetch=async()=>new Response('{}',{status:401});await assert.rejects(()=>provider.readLibraryState(),e=>e.code==='auth');await provider.disconnect();console.log('PASS '+provider.id+': 100 MB chunked upload, bounded chunks, completed progress, endpoint/token isolation and expired-token response.');
}
globalThis.fetch=originalFetch;
