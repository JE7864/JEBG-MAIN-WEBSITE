'use strict';
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../docs/admin/index.html'),'utf8'),config=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/backend-config.json'),'utf8'));
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1],reports=[];
function check(n,v){if(!v)throw Error(n);reports.push(n);}
async function fixture(options={}){
 const events={},navigations=[],timers=[],cleared=[],fetches=[];
 const elements={'admin-url':{value:''},status:{textContent:''},hint:{textContent:''},entry:{hidden:true,addEventListener:(name,fn)=>events[name]=fn},'connection-state':{textContent:''}};
 const Abort=class{constructor(){this.signal={};}abort(){this.signal.aborted=true;if(this.signal.abort)this.signal.abort();}};
 new Function('document','window','fetch','AbortController','setTimeout','clearTimeout',script)(
 {getElementById:id=>elements[id]},
 {location:{replace:url=>{if(options.blockNavigation)throw Error('navigation blocked');navigations.push({method:'replace',url});},assign:url=>navigations.push({method:'assign',url})}},
 async(url,init)=>{fetches.push({url,init});if(options.networkError)throw Error();if(options.hang)return new Promise((resolve,reject)=>init.signal.abort=()=>reject(Error('aborted')));return {ok:options.ok!==false,json:async()=>{if(options.badJSON)throw Error('invalid json');return options.data===undefined?config:options.data;}};},
 Abort,fn=>{timers.push(fn);return timers.length;},id=>cleared.push(id));
 const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};await flush();
 return {elements,events,navigations,timers,cleared,fetches,flush};
}
(async()=>{
 check('public submission endpoint retained',config.submissionUrl==='https://script.google.com/macros/s/AKfycbyfyt1mkqeaUgLu0b-nKTYIUXi4CvJn3GXwfyb7aU5WFbS-cbtf3ef1AYrQ6J_vcaVu/exec');
 check('configured URL is Google exec deployment',/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/.test(config.adminUrl));
 check('URL entry hidden during configured opening',html.includes('<form id="entry" hidden>'));
 {
  const f=await fixture();check('automatically opens configured admin route',f.navigations.length===1&&f.navigations[0].url===config.adminUrl+'?page=admin');
  check('redirect replaces launcher history',f.navigations[0].method==='replace');
  check('configured owner does not see URL prompt',f.elements.entry.hidden);
  check('configuration request is same-origin and anonymous',f.fetches[0].url==='../backend-config.json'&&f.fetches[0].init.credentials==='omit'&&f.fetches[0].init.cache==='no-store');
  check('completed load clears deadline',f.cleared.length===1);
 }
 for(const url of ['', 'javascript:alert(1)', 'https://evil.example/exec','https://script.google.com.evil.example/macros/s/aaaaaaaaaaaaaaaaaaaa/exec',config.adminUrl+'?next=evil',config.adminUrl.replace('/exec','/dev')]){
  const f=await fixture({data:{schemaVersion:1,adminUrl:url}});check('invalid target rejected '+url,f.navigations.length===0&&!f.elements.entry.hidden);
 }
 for(const options of [{networkError:true},{ok:false},{badJSON:true},{data:null},{data:{schemaVersion:2,adminUrl:config.adminUrl}}]){
  const f=await fixture(options);check('failure offers manual fallback '+JSON.stringify(options),f.navigations.length===0&&!f.elements.entry.hidden);
 }
 {
  const f=await fixture({hang:true});f.timers[0]();await f.flush();check('timeout restores manual access',!f.elements.entry.hidden&&f.navigations.length===0);
 }
 {
  const f=await fixture({blockNavigation:true});check('blocked redirect retains prefilled manual fallback',!f.elements.entry.hidden&&f.elements['admin-url'].value===config.adminUrl);
  let prevented=false;f.events.submit({preventDefault(){prevented=true;}});check('fallback button opens same secure destination',prevented&&f.navigations[0].method==='assign'&&f.navigations[0].url===config.adminUrl+'?page=admin');
  f.elements['admin-url'].value='https://evil.example/exec';f.events.submit({preventDefault(){}});check('manual fallback also rejects external hosts',f.navigations.length===1&&f.elements.status.textContent.includes('valid Google'));
 }
 check('no password or token collection',!/<input[^>]*(?:type="password"|name="(?:token|password)")/.test(html)&&!script.includes('localStorage'));
 console.log(reports.length+' admin launcher checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
