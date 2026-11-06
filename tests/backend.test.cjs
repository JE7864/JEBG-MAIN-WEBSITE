'use strict';
const fs=require('node:fs');
const path=require('node:path');
const CODE=fs.readFileSync(path.join(__dirname,'../backend/Code.gs'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../backend/Email.gs'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../backend/Settings.gs'),'utf8');
const passed=(function(){
if(new Function(CODE+';return JEBG_CONFIG.spreadsheetId;')()!=='1KqIlgyfKgGCdc-ZwRT0NF1f6WeJkKJV7WQ5mSZHHeJQ')throw Error('Backend must target JEBG MAIN');
const reports=[];
function check(name,condition){if(!condition)throw Error(name);reports.push(name);}
function fixture(options={}){
 const rows={};let schema;
 const range=(tab,r,c,n,w)=>({
  getDisplayValues:()=>[schema[tab].headers],
  getValues:()=>{if(r===1)return [schema[tab].headers];const found=rows[tab].slice(r-2,r-2+n).map(x=>x.slice(c-1,c-1+w));if(options.corruptReadback&&n===1&&found.length)found[0][0]='wrong';return found;},
  setValues:values=>{if(options.failWrite)throw Error('Write failed');rows[tab][r-2]=values[0].slice();}
 });
 const sheets={};
 const book={getSheetByName:tab=>{if(options.missingSheet)return null;return sheets[tab]||(sheets[tab]={getRange:(r,c,n,w)=>range(tab,r,c,n,w),getLastRow:()=>rows[tab].length+1,getMaxRows:()=>1000,insertRowsAfter(){}})}};
 const api=new Function('SpreadsheetApp','LockService','Utilities','PropertiesService','CacheService','HtmlService',CODE+';return {saveSubmission_,doPost,doGet,receipt_,schema:JEBG_SCHEMA};')(
 {openById:()=>book,flush(){}},{getScriptLock:()=>({tryLock:()=>!options.busy,releaseLock(){}})},
 {getUuid:()=> 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',formatDate:()=> '2026-11-05',computeDigest:(_,s)=>Array.from(s).map(c=>c.charCodeAt(0)%256),DigestAlgorithm:{SHA_256:'sha'},Charset:{UTF_8:'utf8'}},
 {getScriptProperties:()=>({getProperty:()=>null,setProperty(){}})},{getScriptCache:()=>({get:()=>null,put(){}})},
 {createHtmlOutput:html=>({html,setTitle(){return this}})}
 );
 schema=Object.fromEntries(Object.values(api.schema).map(s=>[s.tab,s]));Object.keys(schema).forEach(tab=>rows[tab]=[]);
 return {...api,rows};
}
function input(kind){return {kind,name:'Milestone test',email:'milestone@example.com',company:'JEBG QA',product:'JEBG USSS',location:'Test location',specialisation:'QA / Deployment',experience:'Test',availability:'Test only',engagement:'Open to discussion',message:'Milestone 1.1.0 test',agreement:true,consent:false,requestId:'11111111-2222-4333-8444-555555555555'};}
for(const kind of ['customer','expert']){
 const f=fixture(),data=input(kind),result=f.saveSubmission_(data),tab=f.schema[kind].tab;
 check(kind+' writes to correct tab',f.rows[tab].length===1&&!result.duplicate);
 const again=f.saveSubmission_(data);
 check(kind+' retry does not duplicate',again.duplicate&&again.id===result.id&&f.rows[tab].length===1);
 const receipt=f.doPost({parameter:{payload:JSON.stringify(data)}}).html;
 check(kind+' duplicate receipt explains existing record',receipt.includes('Already safely received.')&&receipt.includes('No duplicate was added.'));
}
for(const [name,opt] of [['write failure',{failWrite:true}],['readback mismatch',{corruptReadback:true}],['missing tab',{missingSheet:true}],['busy lock',{busy:true}]]){
 const html=fixture(opt).doPost({parameter:{payload:JSON.stringify(input('customer'))}}).html;
 check(name+' never shows success',!html.includes('Submission confirmed')&&!html.includes('YOUR REFERENCE NUMBER'));
}
check('invalid JSON is rejected',!fixture().doPost({parameter:{payload:'broken'}}).html.includes('Submission confirmed'));
const noConsent=input('customer');noConsent.agreement=false;
check('required agreement enforced',!fixture().doPost({parameter:{payload:JSON.stringify(noConsent)}}).html.includes('Submission confirmed'));
check('GET cannot claim a save',!fixture().doGet().html.includes('Submission confirmed'));
check('receipt escapes untrusted message',fixture().receipt_(false,'<script>alert(1)</script>','').html.includes('&lt;script&gt;'));
return reports;
})();
console.log(passed.map(x=>'PASS '+x).join('\n'));
console.log(passed.length+' checks passed.');
