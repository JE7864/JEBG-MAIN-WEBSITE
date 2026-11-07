'use strict';
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../docs/index.html'),'utf8');
const marker=html.indexOf('// Public visit figures use an external counter;');
const client=html.slice(html.indexOf('(async function()',marker),html.indexOf('</script>',marker));
const reports=[];function check(n,v){if(!v)throw Error(n);reports.push(n);}
async function run(options={}){
 const elements={'footer-metrics':{hidden:true},'metric-visits':{textContent:'0',setAttribute(k,v){this[k]=v;}},'metric-daily':{textContent:'0',setAttribute(k,v){this[k]=v;}}},requests=[],timers=[],cleared=[];
 const Clock=class extends Date{constructor(...args){super(...(args.length?args:[options.now||'2026-11-07T12:00:00Z']));}};
 const Abort=class{constructor(){this.signal={};}abort(){this.signal.aborted=true;}};
 const promise=new Function('document','location','fetch','AbortController','setTimeout','clearTimeout','Date','Intl','return '+client)(
 {getElementById:id=>{if(!elements[id])throw Error('Unexpected element: '+id);return elements[id];}},
 {hostname:options.host||'jebg.jamilaexim.com'},
 async(url,init)=>{requests.push({url,init});if(options.networkError)throw Error('network unavailable');return {ok:options.ok!==false,json:async()=>{if(options.jsonError)throw Error('bad JSON');return options.data===undefined?{value:'25'}:options.data;}};},
 Abort,fn=>{timers.push(fn);return timers.length;},id=>cleared.push(id),Clock,Intl);
 await promise;return {elements,requests,timers,cleared};
}
(async()=>{
 const markup=html.match(/<div class="footer-metrics"[^>]*>[\s\S]*?<\/div>/)[0];
 check('only two numbers in visible markup',/^00$/.test(markup.replace(/<[^>]*>/g,'')));
 check('no form-submission counters remain',!html.includes('metric-customers')&&!html.includes('metric-developers'));
 check('no Google stats endpoint or visit event',!html.includes('?page=stats')&&!html.includes('page_visit')&&!html.includes('jebgFooterStats'));
 check('counter independent of Google endpoint config',!client.includes('googleWebAppUrl')&&!client.includes('backendConnectionReady'));
 check('counter starts hidden',/\bhidden>/.test(markup));
 check('two keyboard-accessible labelled values',(markup.match(/tabindex="0" aria-label=/g)||[]).length===2);
 {
  const f=await run();check('one increment per page load',f.requests.length===1);check('verified public external endpoint',f.requests[0].url==='https://countapi.mileshilliard.com/api/v1/hit/jebg_main_website_visits_20261107');
  check('credentials omitted',f.requests[0].init.credentials==='omit');check('referrer omitted',f.requests[0].init.referrerPolicy==='no-referrer');
  check('no form fields or request body sent',!f.requests[0].init.body);check('no executable third-party script',!client.includes('createElement'));
  check('string API count rendered',f.elements['metric-visits'].textContent==='25');check('launch-day average denominator one',f.elements['metric-daily'].textContent==='25');
  check('real response reveals strip',!f.elements['footer-metrics'].hidden);check('hover and screen reader labels available',f.elements['metric-visits'].title.includes('Recorded page visits')&&f.elements['metric-daily']['aria-label'].includes('Average page visits'));
  check('timeout cleared',f.cleared.length===1);
 }
 {
  const f=await run({data:{value:5},now:'2026-11-08T12:00:00Z'});check('second-day average correct',f.elements['metric-daily'].textContent==='2.5');
 }
 {
  const before=await run({data:{value:4},now:'2026-11-07T18:29:00Z'}),after=await run({data:{value:4},now:'2026-11-07T18:31:00Z'});
  check('IST midnight changes denominator',before.elements['metric-daily'].textContent==='4'&&after.elements['metric-daily'].textContent==='2');
 }
 for(const value of [-1,1.5,null,true,'not-a-number','<script>','9007199254740992']){
  const f=await run({data:{value}});check('invalid value stays hidden: '+String(value),f.elements['footer-metrics'].hidden);
 }
 {
  const f=await run({data:{value:0}});check('real zero accepted',!f.elements['footer-metrics'].hidden&&f.elements['metric-visits'].textContent==='0');
 }
 for(const options of [{networkError:true},{ok:false},{jsonError:true},{data:{error:'rate limited'}}]){
  const f=await run(options);check('failure does not fabricate numbers '+JSON.stringify(options),f.elements['footer-metrics'].hidden);check('failure does not retry increment '+JSON.stringify(options),f.requests.length===1);
 }
 {
  const f=await run({host:'preview.example.com'});check('preview hosts do not increment production',f.requests.length===0&&f.elements['footer-metrics'].hidden);
 }
 {
  const f=await run({now:'2026-11-06T10:00:00Z'});check('incorrect clock does not show impossible average',f.elements['footer-metrics'].hidden);
 }
 console.log(reports.length+' external visit counter checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
