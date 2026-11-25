/* Vector text, subset fonts and original illustrations; never rasterise whole book pages. */
importScripts('/vendor/pdf-lib.min.js','/vendor/fontkit.min.js');
self.onmessage=async({data:{book,publication,bytes}})=>{
  try{
    const {PDFDocument,PDFName,PDFHexString,rgb}=PDFLib;
    if(book.format==='pdf'){
      if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw Error('The source did not return a PDF.');
      const source=await PDFDocument.load(bytes),out=await PDFDocument.create();for(let i=0;i<source.getPageCount();i+=4){for(const page of await out.copyPages(source,source.getPageIndices().slice(i,i+4))){page.node.delete(PDFName.of('Annots'));page.node.delete(PDFName.of('AA'));out.addPage(page)}postMessage({progress:'Checking PDF pages…',percent:45+45*(i+1)/source.getPageCount()})}const pdf=await out.save();postMessage({pdf:pdf.buffer,pages:out.getPageCount()},[pdf.buffer]);return;
    }
    const out=await PDFDocument.create();out.registerFontkit(fontkit);out.setTitle(book.title);out.setAuthor(book.author);out.setCreator('GoodReadence · Casid Studio');out.setSubject('Source edition: '+book.source);out.setLanguage('en');
    const fontBytes=await(await fetch('/assets/fonts/NotoSerif-Regular.ttf')).arrayBuffer(),font=await out.embedFont(fontBytes,{subset:true}),available=new Set(font.getCharacterSet()),fallback=new Map();
    const normalize=text=>text.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u00ad\u200b\u2060\ufe0e\ufe0f\ufeff]/g,'');
    const unsupported=new Set();for(const section of publication.sections)for(const block of section.blocks)for(const char of normalize(block.text||''))if(!/\s/.test(char)&&!available.has(char.codePointAt(0)))unsupported.add(char);
    for(const name of [...([...unsupported].some(c=>c.codePointAt(0)>=0x590&&c.codePointAt(0)<=0x5ff)?['NotoSerifHebrew']:[]),'NotoSansSymbols2','NotoSansSymbols','NotoSansMath','CasidSymbols']){if(!unsupported.size)break;const response=await fetch('/assets/fonts/'+name+'-Regular.ttf');if(!response.ok)throw Error('The reading fonts could not load. Try again online.');const extra=await out.embedFont(await response.arrayBuffer(),{subset:true}),coverage=new Set(extra.getCharacterSet());for(const char of unsupported){if(coverage.has(char.codePointAt(0))){fallback.set(char,extra);unsupported.delete(char)}}}
    if(unsupported.size)throw Error('This edition uses characters that cannot yet be converted accurately. Please use the original source edition.');
    const width=432,height=648,margin=40,measure=width-margin*2,size=11,lineHeight=16,foot=32,top=height-margin,outline=[],cache=new Map();let page,y=top,printed=0,characters=0;
    const fresh=()=>{page=out.addPage([width,height]);y=top;page.drawText(String(out.getPageCount()),{font,size:7,x:width/2-5,y:18,color:rgb(.45,.45,.45)})};
    const needed=space=>{if(!page||y-space<foot)fresh()};
    const runs=word=>{const result=[];for(const char of word){const current=fallback.get(char)||font,last=result.at(-1);if(last?.font===current)last.text+=char;else result.push({font:current,text:char})}return result};
    const wordWidth=(word,pt)=>{const key=pt+':'+word;if(!cache.has(key)){if(cache.size>16000)cache.clear();cache.set(key,runs(word).reduce((sum,run)=>sum+run.font.widthOfTextAtSize(run.text,pt),0))}return cache.get(key)};
    const drawLine=(line,pt)=>{needed(lineHeight);let x=margin;const parts=runs(line);for(let i=0;i<parts.length;i++){const run=parts[i];page.drawText(run.text,{x,y,font:run.font,size:pt,color:rgb(.12,.12,.12)});if(i<parts.length-1)x+=run.font.widthOfTextAtSize(run.text,pt)}y-=pt===size?lineHeight:pt*1.4;printed+=line.length};
    function textBlock(text,kind){
      text=normalize(text);const pt=kind==='heading'?15:size;
      if(kind==='heading'){needed(60);y-=12}
      for(const paragraph of text.split('\n')){let line='',used=0;const space=wordWidth(' ',pt);for(const word of paragraph.split(/\s+/).filter(Boolean)){
        const span=wordWidth(word,pt);if(span>measure){if(line){drawLine(line,pt);line='';used=0}let part='';for(const char of word){if(wordWidth(part+char,pt)>measure&&part){drawLine(part,pt);part=char}else part+=char}line=part;used=wordWidth(part,pt);continue}
        if(line&&used+space+span>measure){drawLine(line,pt);line=word;used=span}else{line+=(line?' ':'')+word;used+=span+(line===word?0:space)}
      }if(line)drawLine(line,pt);else y-=lineHeight}
      y-=kind==='heading'?10:6;characters+=text.length;
    }
    const imageCache=new Map();
    async function imageBlock(block){
      let image=imageCache.get(block.image);if(!image){const source=publication.images.find(i=>i.path===block.image);if(!source)throw Error('An illustration is missing.');if(source.bytes[0]===255&&source.bytes[1]===216)image=await out.embedJpg(source.bytes);else if(source.bytes[0]===137&&source.bytes[1]===80)image=await out.embedPng(source.bytes);else{
        const bitmap=await createImageBitmap(new Blob([source.bytes],{type:source.type}));if(bitmap.width*bitmap.height>24000000){bitmap.close();throw Error('An illustration is too large for this device.')}const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);bitmap.close();image=await out.embedJpg(await(await canvas.convertToBlob({type:'image/jpeg',quality:.88})).arrayBuffer());canvas.width=canvas.height=0;
      }imageCache.set(block.image,image)}
      const scale=Math.min(measure/image.width,(top-foot-16)/image.height),w=image.width*scale,h=image.height*scale;needed(h+14);page.drawImage(image,{x:(width-w)/2,y:y-h,width:w,height:h});y-=h+14;
    }
    for(let index=0;index<publication.sections.length;index++){
      const section=publication.sections[index];if(!section.blocks.length)continue;if(page&&y<top)fresh();else needed(20);outline.push({title:section.title,page});
      for(const block of section.blocks){if(block.image)await imageBlock(block);else textBlock(block.text,block.kind);if(out.getPageCount()>6000)throw Error('This edition exceeds the 6,000-page preparation limit.')}
      postMessage({progress:'Creating your PDF · '+(index+1)+' of '+publication.sections.length+' sections',percent:45+45*(index+1)/publication.sections.length});await new Promise(r=>setTimeout(r,0));
    }
    if(!printed||characters<publication.characters*.98)throw Error('The complete book could not be converted. No partial copy was saved.');
    // Clickable chapter index for the existing reader's Index panel.
    if(outline.length){const context=out.context,root=context.register(context.obj({Type:'Outlines',Count:outline.length})),refs=outline.map(()=>context.nextRef());outline.forEach((entry,i)=>{const item={Title:PDFHexString.fromText(entry.title),Parent:root,Dest:context.obj([entry.page.ref,PDFName.of('Fit')])};if(i)item.Prev=refs[i-1];if(i<refs.length-1)item.Next=refs[i+1];context.assign(refs[i],context.obj(item))});const dictionary=context.lookup(root);dictionary.set(PDFName.of('First'),refs[0]);dictionary.set(PDFName.of('Last'),refs.at(-1));out.catalog.set(PDFName.of('Outlines'),root)}
    postMessage({progress:'Finishing your PDF…',percent:92});const pdf=await out.save({useObjectStreams:true});postMessage({pdf:pdf.buffer,pages:out.getPageCount()},[pdf.buffer]);
  }catch(error){postMessage({error:error.message||'The book could not be converted. No partial copy was saved.'})}
};
