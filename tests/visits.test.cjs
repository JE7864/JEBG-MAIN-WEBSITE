'use strict';
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../docs/index.html'),'utf8');
const marker=html.indexOf('// Public visit figures use an external counter;');
const client=html.slice(html.indexOf('(async function()',marker),html.indexOf('</script>',marker));
const reports=[];function check(n,v){if(!v)throw Error(n);reports.push(n);}
function create(options={}){
 const requests=[],timers=[],cleared=[],frames=[],winEvents={},docEvents={},formEvents={},counts={visits:24,customer:3,developer:4,partner:0,engaged:5,...options.counts},missing=new Set(options.missing||[]);
 const elements={'footer-metrics':{hidden:true}};
 ['metric-visits','metric-daily','metric-customer-starts','metric-customer-rate','metric-developer-starts','metric-developer-rate','metric-partner-starts','metric-partner-rate','metric-engaged','metric-engagement-rate'].forEach(id=>elements[id]={textContent:'0',setAttribute(k,v){this[k]=v;}});
 ['enquiry','expert-form','partner-form'].forEach(id=>{formEvents[id]={};elements[id]={addEventListener(type,fn){formEvents[id][type]=fn;}};});
 const doc={visibilityState:'visible',documentElement:{scrollHeight:options.height||1000},body:{scrollHeight:options.bodyHeight||1000},getElementById:id=>{if(!elements[id])throw Error('Unexpected element '+id);return elements[id];},addEventListener:(type,fn)=>docEvents[type]=fn};
 const win={scrollY:0,innerHeight:options.viewport||200,addEventListener:(type,fn)=>winEvents[type]=fn};
 const Clock=class extends Date{constructor(...args){super(...(args.length?args:[options.now||'2026-11-07T12:00:00Z']));}};
 const Abort=class{constructor(){this.signal={};}abort(){this.signal.aborted=true;}};
 const kindOf=url=>url.includes('customer_starts')?'customer':url.includes('developer_starts')?'developer':url.includes('partner_starts')?'partner':url.includes('engaged_depth')?'engaged':'visits';
 const ready=new Function('document','window','location','fetch','AbortController','setTimeout','clearTimeout','requestAnimationFrame','Date','Intl','return '+client)(
 doc,win,{hostname:options.host||'jebg.jamilaexim.com'},
 async(url,init)=>{
  const kind=kindOf(url),readOnly=url.includes('/get/');requests.push({url,init,kind,readOnly});
  if(options.networkError)throw Error('network unavailable');
  if(options.ok===false)return {ok:false,status:503,json:async()=>({error:'unavailable'})};
  if(readOnly&&missing.has(kind))return {ok:false,status:404,json:async()=>({error:options.missingMessage||'Key not found'})};
  if(!readOnly){counts[kind]++;missing.delete(kind);}
  return {ok:true,status:200,json:async()=>{if(options.jsonError)throw Error('bad JSON');return kind==='visits'&&options.data!==undefined?options.data:{value:String(counts[kind])};}};
 },
 Abort,fn=>{timers.push(fn);return timers.length;},id=>cleared.push(id),fn=>frames.push(fn),Clock,Intl);
 const flush=async()=>{while(frames.length)frames.shift()();for(let i=0;i<12;i++)await Promise.resolve();};
 const emit=(id,type,field={},trusted=true)=>formEvents[id][type]({isTrusted:trusted,target:{tagName:'INPUT',name:'name',type:'text',value:'Private typed text',...field}});
 const hits=kind=>requests.filter(r=>!r.readOnly&&(!kind||r.kind===kind));
 return {ready,elements,requests,timers,cleared,doc,win,winEvents,docEvents,formEvents,flush,emit,hits,counts};
}
async function run(options={}){const f=create(options);await f.ready;await f.flush();return f;}
(async()=>{
 const markup=html.slice(html.indexOf('<div class="footer-metrics"'),html.indexOf('</footer>',html.indexOf('<div class="footer-metrics"')));
 const cells=[...markup.matchAll(/<div class="activity-cell">(<span[^>]*>[\s\S]*?<\/span>)<\/div>/g)];
 check('ten number-only figures without visible heading labels or date',!markup.includes('Website activity')&&!markup.includes('Since 7 Nov 2026')&&!markup.includes('<small>')&&cells.length===10&&cells.every(m=>m[1].replace(/<[^>]*>/g,'')==='0'));
 check('exact requested DOM order',JSON.stringify([...markup.matchAll(/<span id="([^"]+)"/g)].map(m=>m[1]))===JSON.stringify(['metric-visits','metric-daily','metric-customer-starts','metric-customer-rate','metric-developer-starts','metric-developer-rate','metric-partner-starts','metric-partner-rate','metric-engaged','metric-engagement-rate']));
 check('no confirmed-submission counters',!html.includes('metric-customers')&&!html.includes('metric-developers'));
 check('no Google statistics or visit calls',!html.includes('?page=stats')&&!html.includes('page_visit')&&!html.includes('jebgFooterStats'));
 check('independent of Google backend config',!client.includes('googleWebAppUrl')&&!client.includes('backendConnectionReady'));
 check('strip hidden until valid values',/\bhidden>/.test(markup));
 check('ten keyboard-accessible labelled values',(markup.match(/tabindex="0" aria-label=/g)||[]).length===10);
 check('reference-style full-width row and narrow-screen horizontal scroll',html.includes('width:100%;margin:22px 0 0;padding:15px 0 0;border:0;border-top:1px solid #28485c')&&html.includes('grid-template-columns:repeat(10,minmax(0,1fr))')&&html.includes('grid-template-columns:repeat(10,minmax(92px,1fr));overflow-x:auto'));
 {
  const f=await run();check('one visit increment on load',f.hits('visits').length===1);check('engagement totals only read on load',f.requests.filter(r=>r.readOnly).length===4&&f.hits().length===1);
  check('fixed verified provider endpoint',f.requests.every(r=>r.url.startsWith('https://countapi.mileshilliard.com/api/v1/')));
  check('credentials and referrer omitted',f.requests.every(r=>r.init.credentials==='omit'&&r.init.referrerPolicy==='no-referrer'));
  check('no form contents sent',f.requests.every(r=>!r.init.body)&&!JSON.stringify(f.requests).includes('Private typed text'));
  check('no third-party executable scripts',!client.includes('createElement'));
  check('original actual figures preserved',f.elements['metric-visits'].textContent==='25'&&f.elements['metric-daily'].textContent==='25'&&f.elements['metric-customer-starts'].textContent==='3'&&f.elements['metric-developer-starts'].textContent==='4'&&f.elements['metric-engaged'].textContent==='5');
  check('customer start rate calculated',f.elements['metric-customer-rate'].textContent==='12');
  check('developer start rate calculated',f.elements['metric-developer-rate'].textContent==='16');
  check('engagement rate calculated',f.elements['metric-engagement-rate'].textContent==='20');
  check('rate hover and screen-reader labels retain units',f.elements['metric-customer-rate'].title.includes('12 percent')&&f.elements['metric-customer-rate']['aria-label'].includes('12 percent'));
  check('rates require no additional requests',f.requests.length===5);
  check('valid figures reveal strip',!f.elements['footer-metrics'].hidden);
  check('tooltips omit reference date',!f.elements['metric-visits'].title.includes('since 7'));
  check('tooltips and accessible names identify starts',f.elements['metric-customer-starts'].title.includes('form starts')&&f.elements['metric-engaged']['aria-label'].includes('75%'));
  check('timeouts cleared',f.cleared.length===5);
  f.emit('enquiry','input');await f.flush();check('customer typing counts one start',f.hits('customer').length===1&&f.elements['metric-customer-starts'].textContent==='4');
  f.emit('enquiry','input',{name:'email',value:'secret@example.com'});f.emit('enquiry','change');await f.flush();check('customer edits and change events do not count twice',f.hits('customer').length===1);
  check('customer rate updates after first input',f.elements['metric-customer-rate'].textContent==='16');
  f.emit('expert-form','input',{tagName:'TEXTAREA',name:'message'});await f.flush();check('developer tracked independently',f.hits('developer').length===1&&f.elements['metric-developer-starts'].textContent==='5');
  f.emit('partner-form','input',{name:'industry',value:'Private partner network'});await f.flush();
  check('partner tracked independently',f.hits('partner').length===1&&f.elements['metric-partner-starts'].textContent==='1'&&f.elements['metric-partner-rate'].textContent==='4');
  f.emit('partner-form','change');await f.flush();check('partner edits do not count twice',f.hits('partner').length===1);
  check('partner tooltips preserved',f.elements['metric-partner-starts'].title.includes('Partner application form starts')&&f.elements['metric-partner-rate']['aria-label'].includes('percent'));
  check('partner data never appears in counter requests',!JSON.stringify(f.requests).includes('Private partner network'));
  check('typed values never appear in requests',!JSON.stringify(f.requests).includes('secret@example.com')&&!JSON.stringify(f.requests).includes('Private typed text'));
  f.win.scrollY=549;f.winEvents.scroll();await f.flush();check('below 75 percent does not engage',f.hits('engaged').length===0);
  f.win.scrollY=550;f.winEvents.scroll();await f.flush();check('exactly 75 percent counts engagement',f.hits('engaged').length===1&&f.elements['metric-engaged'].textContent==='6');
  f.win.scrollY=800;f.winEvents.scroll();f.winEvents.resize();await f.flush();check('repeated scroll and resize count once',f.hits('engaged').length===1);
  check('developer and engagement rates update on events',f.elements['metric-developer-rate'].textContent==='20'&&f.elements['metric-engagement-rate'].textContent==='24');
 }
 for(const field of [{value:''},{value:'  '},{name:'website'},{type:'hidden'},{type:'checkbox'},{type:'radio'},{disabled:true},{tagName:'DIV'},{name:''}]){
  const f=await run();f.emit('enquiry','input',field);await f.flush();check('ignored field '+JSON.stringify(field),f.hits('customer').length===0);
 }
 {
  const f=await run();f.emit('enquiry','input',{},false);await f.flush();check('synthetic programmatic events ignored',f.hits('customer').length===0);
  f.emit('enquiry','change',{tagName:'SELECT',name:'product',type:'select-one',value:'JEBG USSS'});await f.flush();check('genuine nonempty selection starts form',f.hits('customer').length===1);
 }
 {
  const f=await run({now:'2026-11-08T12:00:00Z',data:{value:5}});check('daily average denominator correct',f.elements['metric-daily'].textContent==='2.5');
  const before=await run({now:'2026-11-07T18:29:00Z',data:{value:4}}),after=await run({now:'2026-11-07T18:31:00Z',data:{value:4}});
  check('IST midnight changes average day',before.elements['metric-daily'].textContent==='4'&&after.elements['metric-daily'].textContent==='2');
 }
 for(const value of [-1,1.5,null,true,'not-a-number','<script>','9007199254740992']){
  const f=await run({data:{value}});check('invalid value hidden '+String(value),f.elements['footer-metrics'].hidden);
 }
 {
  const f=await run({counts:{visits:0,customer:0,developer:0,engaged:0},missing:['customer','developer','partner','engaged']});
  check('confirmed missing keys represent real zero',!f.elements['footer-metrics'].hidden&&f.elements['metric-customer-starts'].textContent==='0'&&f.elements['metric-partner-starts'].textContent==='0');
  f.emit('partner-form','input');await f.flush();check('first partner event initializes unused key',f.elements['metric-partner-starts'].textContent==='1');
  f.emit('enquiry','input');await f.flush();check('first genuine event initializes key',f.elements['metric-customer-starts'].textContent==='1');
 }
 {
  const f=await run({missing:['customer'],missingMessage:'unknown problem'});check('unrecognized 404 is not fabricated as zero',f.elements['footer-metrics'].hidden);
 }
 for(const options of [{networkError:true},{ok:false},{jsonError:true},{data:{error:'rate limited'}}]){
  const f=await run(options);check('failure hides incomplete figures '+JSON.stringify(options),f.elements['footer-metrics'].hidden);check('failed visit increment never retried '+JSON.stringify(options),f.hits('visits').length===1);
 }
 {
  const f=await run({host:'preview.example.com'});check('preview makes no production counter requests',f.requests.length===0&&f.elements['footer-metrics'].hidden);
 }
 {
  const f=await run({now:'2026-11-06T12:00:00Z'});check('bad clock never produces invalid average',f.elements['footer-metrics'].hidden);
 }
 {
  const f=await run();f.doc.visibilityState='hidden';f.win.scrollY=800;f.winEvents.scroll();await f.flush();check('hidden tab does not engage',f.hits('engaged').length===0);
  f.doc.visibilityState='visible';f.docEvents.visibilitychange();await f.flush();check('visible deep page engages once',f.hits('engaged').length===1);
 }
 {
  const f=await run({bodyHeight:1400});f.win.scrollY=550;f.winEvents.scroll();await f.flush();check('uses full document height',f.hits('engaged').length===0);
 }
 {
  const f=await run({networkError:true});f.emit('enquiry','input');await f.flush();f.emit('enquiry','change');await f.flush();check('ambiguous form start failure not retried',f.hits('customer').length===1);
 }
 {
  const f=create({counts:{customer:0},missing:['customer']});f.emit('enquiry','input');await f.ready;await f.flush();check('early input is counted before startup reads finish',f.hits('customer').length===1&&f.elements['metric-customer-starts'].textContent==='1');
 }
 
 {
  const f=await run({counts:{visits:2,customer:1,developer:2,engaged:3}});
  check('percentage values round to nearest integer',f.elements['metric-customer-rate'].textContent==='33'&&f.elements['metric-developer-rate'].textContent==='67');
  check('rate values have no decimals or percent signs',['metric-customer-rate','metric-developer-rate','metric-engagement-rate'].every(id=>/^\d+$/.test(f.elements[id].textContent)));
  check('one hundred percent renders correctly',f.elements['metric-engagement-rate'].textContent==='100');
 }
 {
  const f=await run({data:{value:0},counts:{customer:0,developer:0,engaged:0}});
  check('zero visits shows safe zero rates',['metric-customer-rate','metric-developer-rate','metric-engagement-rate'].every(id=>f.elements[id].textContent==='0'));
 }
 {
  const f=await run({counts:{customer:30}});
  check('aggregate ratio not silently capped',f.elements['metric-customer-rate'].textContent==='120');
 }
 console.log(reports.length+' external visit, engagement and rate checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
