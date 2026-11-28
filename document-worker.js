/* Bounded document work stays off the reader's UI thread. */
onmessage=async({data})=>{try{
 if(data.task==='digest'){const hash=await crypto.subtle.digest('SHA-256',await data.blob.arrayBuffer());postMessage({hash:Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('')});return}
 if(!self.PDFLib)importScripts('/vendor/pdf-lib.min.js');
 const {PDFDocument}=PDFLib,out=await PDFDocument.create();let pages=0;
 for(let i=0;i<data.files.length;i++){
  const file=data.files[i];postMessage({progress:'Combining file '+(i+1)+' of '+data.files.length});
  if(/\.(png|jpe?g)$/i.test(file.name)){
   const header=new DataView(await file.slice(0,262144).arrayBuffer());let width,height;if(header.byteLength>=24&&header.getUint32(0)===0x89504e47){width=header.getUint32(16);height=header.getUint32(20)}else{let p=2;while(p+8<header.byteLength){if(header.getUint8(p)!==255){p++;continue}const marker=header.getUint8(p+1);if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=header.getUint16(p+5);width=header.getUint16(p+7);break}const length=header.getUint16(p+2);if(length<2)break;p+=length+2}}
   if(!width||!height||width*height>100000000)throw Error('Choose a readable JPG or PNG below 100 megapixels.');const scale=Math.min(1,2400/Math.max(width,height),Math.sqrt(6000000/(width*height)));const bitmap=await createImageBitmap(file,{resizeWidth:Math.max(1,Math.round(width*scale)),resizeHeight:Math.max(1,Math.round(height*scale)),resizeQuality:'high'});
   const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);bitmap.close();const blob=await canvas.convertToBlob({type:'image/jpeg',quality:.92}),image=await out.embedJpg(await blob.arrayBuffer());const size=image.scale(Math.min(1,842/image.height));out.addPage([size.width,size.height]).drawImage(image,{x:0,y:0,width:size.width,height:size.height});pages++;
  }else{
   const source=await PDFDocument.load(await file.arrayBuffer(),{updateMetadata:false});let indices=source.getPageIndices();if(data.range){indices=[];for(const part of data.range.split(',')){const m=/^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(part);if(!m||+m[1]<1||+(m[2]||m[1])<+m[1]||+(m[2]||m[1])>source.getPageCount())throw Error('Choose a page range inside this PDF.');for(let p=+m[1];p<=+(m[2]||m[1]);p++)indices.push(p-1)}}
   if(indices.length+pages>5000)throw Error('Combine up to 5,000 pages at a time.');for(let at=0;at<indices.length;at+=4){const group=await out.copyPages(source,indices.slice(at,at+4));group.forEach(p=>out.addPage(p));pages+=group.length}
  }
 }
 const bytes=await out.save({objectsPerTick:16});postMessage({bytes,pages},[bytes.buffer]);
}catch(e){postMessage({error:e.message||'This file could not be combined.'})}};
