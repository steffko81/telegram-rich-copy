(()=>{
'use strict';
const source=document.getElementById('source');
const preview=document.getElementById('preview');
const status=document.getElementById('status');
const allow=new Set(['H1','H2','H3','H4','H5','H6','P','DIV','SPAN','BR','STRONG','B','EM','I','U','MARK','S','DEL','SUP','SUB','UL','OL','LI','BLOCKQUOTE','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','DETAILS','SUMMARY','PRE','CODE','A','HR']);
const skip=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','SVG','MATH','TEMPLATE','META','LINK','BASE','VIDEO','AUDIO','IMG']);
const samples={
short:`<h2>📌 Workshop update</h2><p><strong>Saturday 7 November 2026, 10:00</strong> · School library</p><p><u>Important:</u> Room <s>A</s> has changed to <mark>Room B</mark>.</p><p>Bring a notebook, laptop and water.</p>`,
advanced:`<h2>📌 Rich formatting check</h2><p><strong>Confirmed</strong> · <em>Payment pending</em> · <strong><em>Updated</em></strong></p><p><u>Important</u>: <mark>Room B</mark> replaces <s>Room A</s>. x<sup>n+1</sup> and R<sub>room index</sub></p><blockquote>Use the assigned entrance.<blockquote>East Gate only.</blockquote></blockquote><table><thead><tr><th align="left">Item</th><th align="center">Start</th><th align="right">End</th></tr></thead><tbody><tr><td>Workshop</td><td align="center">10:00</td><td align="right">12:00</td></tr></tbody></table><details open><summary>Secondary details</summary><p>Reference <code>REF_A-17/β</code></p><details open><summary>Search phrases</summary><p>B side entrance</p></details></details>`,
reference:`<h2>Volunteer desk reference</h2><p><strong>Saturday · 09:00–17:00</strong> · Building C</p><ol><li>Show ID.</li><li>Confirm room.</li><li>Collect badge.</li></ol><p><a href="https://example.com/info?a=1&amp;b=two#details">Room information</a></p><p>Codes:</p><pre><code>TEST_REF-2026\nA_B-C.D/123:456?x–y&amp;z=1</code></pre><details open><summary>Secondary information</summary><p>Keep the <mark>confirmed</mark> status separate from pending payment.</p></details>`
};
const chatPrompt=`Generate a finished Telegram Rich Text message as semantic HTML source code, not a chat draft. Return EXACTLY ONE fenced html code block and nothing else. Fence markers must be normal Markdown fences (never surround them with angle brackets); do not include fences inside the HTML. Preserve all supplied facts, links, recipient, commitments and statuses. Do not invent dates, places, costs, payment details or extra commitments.\n\nDESIGN BRIEF: A polished, airy and effortlessly scannable MOBILE message. Compact is not cramped. Make independent editorial choices to suit the content, not a rigid template.\n\n1. INFORMATION FIRST. Identify the principal action, schedule, change or decision, and give it immediate visual prominence. Highlight a meaningful date, time, deadline or change with <strong> and optionally one selective <mark>. Do not make readers search a paragraph for the essential information.\n2. TRUE HIERARCHY. Use one brief <h2> main title if helpful, then <h3> for substantial distinct topics. Never substitute a bold <p> for a section heading. Do NOT create a separate heading for greetings, Sunday wishes, exam encouragement or other one-sentence courtesy closings. Place those in a short final <p> instead.\n3. CHOOSE THE RIGHT FORMAT. For just one or two key facts, favor two short, clear paragraphs or distinct emphasized lines; a table usually adds bulk. Use a narrow, readable two-column <table> only if at least three distinct, related logistical facts (or a genuine comparison) become easier to scan in short label/value cells. The table REPLACES the equivalent prose inventory: never restate the same facts in an introductory bold sentence, the table, and a paragraph. Explain only additional context or the necessary action.\n4. BREATHING ROOM. Group each substantive topic into its own semantic heading and short paragraph(s), relying on natural block spacing. Use <hr> only for a major division in a long message; avoid decorative rules in a short announcement. Never fake spacing using empty paragraphs or repeated <br> tags. Telegram, not CSS, controls the final spacing.\n5. EDITORIAL RESTRAINT. Routine announcements should be brief, natural and action-led. No invented greetings, sign-offs, 'Best regards', generic thanks, unsupported progress claims, redundant opening summaries or empty optimism. Courtesy wishes and exam encouragement, when supplied, belong together in ONE short closing <p>, without a heading. Do not invent online location or other logistics. Do not turn a short announcement into a formal letter. Icons are optional and purposeful; avoid calendar-number emojis.\n6. FINAL PHONE-SCAN CHECK. Could a parent immediately find the action, the booking timeframe and the meeting time? Is each factual point expressed ONCE rather than repeated across title, lead-in, table and prose? Are factual claims, confirmed/pending statuses, costs and commitments faithful to the notes? Remove anything that contributes neither information nor necessary courtesy. Never fill a table or section with invented facts.\n\nAllowed semantic HTML: h1–h6, p, strong, em, u, mark, s, sup, sub, ul, ol, li, blockquote, table, thead, tbody, tr, th, td, details, summary, code, pre, a, hr. No CSS, scripts, classes, inline styles, generic wrappers or html/head/body tags. Use descriptive hyperlinks with exact supplied URLs.\n\nINFORMATION TO FORMAT:\n[Replace this line with your facts]`;
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
 if(!text){const p=document.createElement('p');p.className='empty';p.textContent='Your formatted message will appear here.';preview.appendChild(p);updateStatus('Paste an HTML message or choose a sample.');return false;}
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
document.getElementById('prompt').addEventListener('click',async()=>{
 try{await writePlain(chatPrompt);updateStatus('Reusable ChatGPT prompt copied. Paste into regular ChatGPT and replace the facts.','success');}
 catch{updateStatus('Prompt copy was blocked. Please open the source field and copy the prompt from the testing guide.','warn');}
});
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
for(const btn of document.querySelectorAll('[data-sample]'))btn.addEventListener('click',()=>{
 const key=btn.getAttribute('data-sample');source.value=samples[key];render();updateStatus('Sample loaded: '+key+'. Tap Copy formatted message, then test in Telegram Saved Messages.','success');
});
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