(()=>{
'use strict';
const source=document.getElementById('source');
const preview=document.getElementById('preview');
const status=document.getElementById('status');
const allow=new Set(['H1','H2','H3','H4','H5','H6','P','DIV','SPAN','BR','STRONG','B','EM','I','U','MARK','S','DEL','SUP','SUB','UL','OL','LI','BLOCKQUOTE','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','DETAILS','SUMMARY','PRE','CODE','A','HR']);
const skip=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','SVG','MATH','TEMPLATE','META','LINK','BASE','VIDEO','AUDIO','IMG']);
function updateStatus(message,kind='') {status.className=kind;status.textContent=message;}
function clean(node){
 if(node.nodeType===Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
 if(node.nodeType!==Node.ELEMENT_NODE) return document.createDocumentFragment();
 const tag=node.tagName.toUpperCase();
 if(skip.has(tag))return document.createDocumentFragment();
 if(!allow.has(tag)){
  const frag=document.createDocumentFragment();
  for(const child of [...node.childNodes])frag.appendChild(clean(child));
  return frag;
 }
 const el=document.createElement(tag.toLowerCase());
 if(tag==='A'){
  const href=node.getAttribute('href');
  if(href){try{const u=new URL(href);if(['https:','http:'].includes(u.protocol)){el.setAttribute('href',u.href);el.setAttribute('rel','noopener noreferrer');el.setAttribute('target','_blank');}}catch{}}
 }
 if(tag==='DETAILS'&&node.hasAttribute('open'))el.setAttribute('open','');
 if(tag==='OL'&&node.hasAttribute('start')){
  const n=Number(node.getAttribute('start'));if(Number.isInteger(n)&&n>=1&&n<=999)el.setAttribute('start',String(n));
 }
 if(['TH','TD'].includes(tag)){
  for(const attr of ['colspan','rowspan']){const n=Number(node.getAttribute(attr));if(Number.isInteger(n)&&n>=1&&n<=6)el.setAttribute(attr,String(n));}
  const align=(node.getAttribute('align')||'').toLowerCase();if(['left','center','right'].includes(align))el.setAttribute('align',align);
 }
 for(const child of [...node.childNodes])el.appendChild(clean(child));
 return el;
}
function normalize(text){
 let t=text.trim();
 const opening=t.match(/^(?:<\s*)?```[ \t]*(?:html)?[ \t]*\r?\n/i);
 const closing=t.match(/\r?\n```[ \t]*>?[ \t]*$/);
 if(opening||closing){
  if(!opening||!closing||opening[0].length+closing[0].length>=t.length)
   return {error:'Incomplete or malformed HTML code fence. Copy only the message HTML.'};
  t=t.slice(opening[0].length,t.length-closing[0].length).trim();
  if(!t||/^(?:<\s*)?```/.test(t))
   return {error:'Nested or malformed code fence. Copy only one HTML message.'};
  return {html:t,unwrapped:true};
 }
 if(/^(?:<\s*)?```/.test(t)||/```[ \t]*>?[ \t]*$/.test(t))
  return {error:'Unmatched code fence detected. Copy only the HTML fragment.'};
 return {html:t,unwrapped:false};
}
function render(){
 const parsed=normalize(source.value);preview.replaceChildren();
 if(parsed.error){updateStatus(parsed.error,'warn');return false;}
 const text=parsed.html;
 if(!text){const p=document.createElement('p');p.className='empty';p.textContent='Your formatted message will appear here.';preview.appendChild(p);updateStatus('Copy the ChatGPT HTML code block, then tap Paste from clipboard.');return false;}
 if(!/<(?:h[1-6]|p|strong|em|u|mark|ul|ol|li|blockquote|table|details|pre|a|div|span)\b/i.test(text)){
  updateStatus('This does not look like an HTML fragment. Copy the HTML code block, not the whole ChatGPT response.','warn');return false;
 }
 const doc=new DOMParser().parseFromString(text,'text/html');
 if([...doc.body.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())){
  updateStatus('Stray text outside the HTML elements. Please copy only the generated HTML message.','warn');return false;
 }
 for(const child of [...doc.body.childNodes])preview.appendChild(clean(child));
 if(!preview.textContent.trim()){updateStatus('No renderable message content found.','warn');return false;}
 updateStatus(parsed.unwrapped?'Code fences removed. Check the preview, then copy.':'Preview ready. Check the facts, then tap Copy formatted message.');return true;
}
function selectPreview(){const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(preview);selection.removeAllRanges();selection.addRange(range);}
function plainNode(node,depth=0){
 if(node.nodeType===Node.TEXT_NODE)return node.nodeValue;
 if(node.nodeType!==Node.ELEMENT_NODE)return '';
 const tag=node.tagName;
 const text=[...node.childNodes].map(c=>plainNode(c,depth+(tag==='LI'?1:0))).join('');
 if(tag==='BR')return '\n';
 if(tag==='HR')return '\n---\n';
 if(tag==='LI')return '\n'+'  '.repeat(Math.min(depth,4))+'• '+text.trim();
 if(['H1','H2','H3','H4','H5','H6','P','BLOCKQUOTE','DIV','PRE','TABLE','DETAILS','SUMMARY'].includes(tag))return '\n'+text.trim()+'\n';
 if(tag==='TR')return '\n'+text.replace(/\s*\|\s*$/,'')+'\n';
 if(['TH','TD'].includes(tag))return text.trim()+' | ';
 return text;
}
function plainText(){return plainNode(preview).replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
async function writePlain(text){await navigator.clipboard.writeText(text);}
document.getElementById('paste').addEventListener('click',async()=>{
 try{
  if(!navigator.clipboard?.readText)throw new Error('Clipboard read unavailable');
  const t=await navigator.clipboard.readText();
  if(!t.trim())throw new Error('Clipboard is empty');
  source.value=t;
  if(render()){document.querySelector('.source-panel').open=false;updateStatus('HTML pasted and rendered. Check the preview, then copy.','success');}
 }catch(err){document.querySelector('.source-panel').open=true;source.focus();updateStatus('Automatic paste unavailable: '+String(err?.message||err)+'. Long-press in the source field and choose Paste.','warn');}
});
source.addEventListener('input',render);
document.getElementById('select').addEventListener('click',()=>{
 if(!render())return;selectPreview();updateStatus('Preview selected. Use Android selection Copy; this is a separate fallback route.','warn');
});
document.getElementById('copy').addEventListener('click',async()=>{
 if(!render())return;
 const html='<!doctype html><html><body>'+preview.innerHTML+'</body></html>';
 const text=plainText();
 try{
  if(!navigator.clipboard?.write||!window.ClipboardItem)throw new Error('Rich clipboard API unavailable');
  await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);
  updateStatus('Rich clipboard write succeeded. Paste into Telegram Rich Text Editor and verify the saved result.','success');
 }catch(err){
  let copied=false;
  const handle=e=>{if(e.clipboardData){e.clipboardData.setData('text/html',html);e.clipboardData.setData('text/plain',text);e.preventDefault();copied=true;}};
  document.addEventListener('copy',handle,{once:true});
  try{selectPreview();document.execCommand('copy');}catch{}
  document.removeEventListener('copy',handle);
  updateStatus(copied?'Legacy rich clipboard fallback used. Verify Telegram paste.':'Rich copy blocked: '+String(err?.message||err)+'. Try Select preview → Android Copy.',copied?'success':'warn');
 }
});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
})();