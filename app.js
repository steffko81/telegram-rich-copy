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
const chatPrompt=`Generate a finished Telegram Rich Text message as semantic HTML source code, not a chat draft. Return exactly ONE fenced html code block and nothing else. Preserve supplied facts, exact statuses, recipients and links; invent no dates, deadlines, costs, commitments or locations.\n\nDESIGN GOAL: Make the message elegant, airy and effortless to scan on a phone, with clear visual hierarchy. Compact does NOT mean cramped. Choose formatting independently for the specific message, rather than following a fixed template.\n\n- Use actual <h2> or <h3> section headings where there are multiple topics. Do not simulate section headings with a bold <p> immediately adjacent to other text. Separate sections with meaningful block structure so headings clearly belong to the content below them.\n- Make the key action, deadline or timeframe, meeting date/time, changes and confirmed/pending status easy to spot. Use <strong> for essential labels, and <mark> selectively for one or two important values or corrections, not whole paragraphs. Use <u> or <s> only when it adds genuine meaning.\n- Consider a small, readable TWO-COLUMN <table> for a group of 2–4 related facts (for example date, time and location, or booking and payment status). Use <th> and <td> with short cell contents. Do not force a table when prose, a brief list or two short paragraphs are clearer.\n- Give each idea room to breathe. Prefer short paragraphs grouped under distinct headings; avoid walls of text, tightly stacked bold labels, gratuitous repetition and boilerplate closing statements. Maintain natural, audience-appropriate wording. Do not add facts to fill a layout.\n- Use purposeful icons sparingly. Avoid a generic calendar emoji that shows the wrong date. Use blockquotes, lists or collapsible details only when the content benefits from them.\n- Encode structure through semantic HTML elements, not CSS or artificial blank-line tricks. The Telegram editor controls final font metrics and line height.\n\nAllowed elements: h1–h6, p, strong, em, u, mark, s, sup, sub, ul, ol, li, blockquote, table, thead, tbody, tr, th, td, details, summary, code, pre, a, hr. No scripts, CSS, style attributes, classes, html/head/body wrappers, generic div/span wrappers or visible Markdown source. Use descriptive links with the exact supplied URLs.\n\nINFORMATION TO FORMAT:\n[Replace this line with your facts]`;
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
function normalize(text){let t=text.trim();const m=t.match(/^```(?:html)?\s*\n([\s\S]*?)\n```\s*$/i);if(m)t=m[1];return t;}
function render(){
 const text=normalize(source.value);preview.replaceChildren();
 if(!text){const p=document.createElement('p');p.className='empty';p.textContent='Your formatted message will appear here.';preview.appendChild(p);updateStatus('Paste an HTML message or choose a sample.');return false;}
 if(!/<(?:h[1-6]|p|strong|em|u|mark|ul|ol|li|blockquote|table|details|pre|a|div|span)\b/i.test(text)){
  updateStatus('This does not look like an HTML fragment. Copy the HTML code block, not the whole ChatGPT response.','warn');return false;
 }
 const doc=new DOMParser().parseFromString(text,'text/html');
 for(const child of [...doc.body.childNodes])preview.appendChild(clean(child));
 if(!preview.textContent.trim()){updateStatus('No renderable message content found.','warn');return false;}
 updateStatus('Preview ready. Check the facts, then tap Copy formatted message.');return true;
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