'use strict';
const fs=require('node:fs'),path=require('node:path');
const CODE=['Code.gs','Email.gs','Settings.gs','Admin.gs'].map(n=>fs.readFileSync(path.join(__dirname,'../backend',n),'utf8')).join('\n');
const reports=[];function check(n,v){if(!v)throw Error(n);reports.push(n);}function reject(n,fn,re){let err;try{fn();}catch(e){err=e;}check(n,err&&re.test(err.message));}
function fixture(){
 let zone='Etc/UTC',failOnce=false;const tabs={},specs=new Function(CODE+';return adminSpecs_();')();
 const offset=()=>zone==='Asia/Kolkata'||zone==='Asia/Calcutta'?19800000:0;
 const book={getSpreadsheetTimeZone:()=>zone,setSpreadsheetTimeZone:v=>zone=v,getSheetByName:n=>tabs[n]};
 specs.forEach(spec=>{
  const stampCols=spec.headers.map((h,i)=>/ IST$/.test(h)?i:-1).filter(i=>i>=0);
  const row=spec.headers.map(()=> 'unchanged');row[0]='REF';stampCols.forEach(i=>row[i]=Date.parse('2026-11-07T09:00:00Z'));if(spec.kind==='email'){row[4]='Sent';row[5]=1;}
  const raw=[spec.headers.map(h=>h.replace(/ IST$/,' UTC')),row];
  tabs[spec.name]={raw,stampCols,getLastRow:()=>raw.length,getRange(r,c,n,w){
   const range={getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>{const v=raw[r-1+i]?.[c-1+j]??'';return r+i>1&&stampCols.includes(c-1+j)&&typeof v==='number'?new Date(v-offset()):v;})),getDisplayValues:()=>range.getValues().map(row=>row.map(String)),getFormulas:()=>Array.from({length:n},()=>Array(w).fill('')),getNumberFormats:()=>Array.from({length:n},()=>Array(w).fill('old-format')),setNumberFormat(){return range;},setNumberFormats(){return range;},setValues(values){if(failOnce){failOnce=false;throw Error('simulated write error');}values.forEach((row,i)=>row.forEach((v,j)=>raw[r-1+i][c-1+j]=v instanceof Date?v.getTime()+offset():v));return range;}};return range;
  }};
 });
 const api=new Function('SpreadsheetApp',CODE+';return {applyIndianTime_,headerMatches_};')({flush(){}});
 return {api,book,tabs,getZone:()=>zone,setZone:z=>zone=z,fail:()=>failOnce=true};
}
{
 const f=fixture(),before=JSON.stringify(f.tabs),customer=f.tabs['Customer Enquiries'],instant=customer.getRange(2,2,1,1).getValues()[0][0].getTime();
 f.api.applyIndianTime_(f.book);
 check('workbook uses Asia/Kolkata',f.getZone()==='Asia/Kolkata');
 check('UTC 09:00 displays IST 14:30',new Date(customer.raw[1][1]).toISOString().includes('14:30:00'));
 check('readback is the identical instant',customer.getRange(2,2,1,1).getValues()[0][0].getTime()===instant);
 check('all five timestamp header names use IST',Object.values(f.tabs).every(s=>s.stampCols.every(i=>/ IST$/.test(s.raw[0][i]))));
 check('email state and attempts unchanged',f.tabs['Email Notifications'].raw[1][4]==='Sent'&&f.tabs['Email Notifications'].raw[1][5]===1);
 check('customer submitted content unchanged',customer.raw[1][2]==='unchanged');
 const after=JSON.stringify(f.tabs);f.api.applyIndianTime_(f.book);check('repeat is idempotent',JSON.stringify(f.tabs)===after);
 check('legacy UTC headers accepted',f.api.headerMatches_('Submitted At UTC','Submitted At IST'));
 check('unrelated header mismatch rejected',!f.api.headerMatches_('Other','Submitted At IST'));
}
{
 const f=fixture(),before=JSON.stringify(f.tabs);f.fail();reject('write error rolls back',()=>f.api.applyIndianTime_(f.book),/rolled back/);
 check('rollback restores UTC timezone',f.getZone()==='Etc/UTC');check('rollback restores original dates and headers',JSON.stringify(f.tabs)===before);
}
{
 const f=fixture();f.tabs['Customer Enquiries'].raw[1][1]='ambiguous date';const before=JSON.stringify(f.tabs);
 reject('ambiguous timestamp refused',()=>f.api.applyIndianTime_(f.book),/Unrecognized timestamp/);
 check('preflight errors do not modify data',JSON.stringify(f.tabs)===before&&f.getZone()==='Etc/UTC');
}
{
 const f=fixture();f.setZone('Asia/Kolkata');reject('mixed timezone and header refused',()=>f.api.applyIndianTime_(f.book),/disagree/);
}
console.log(reports.length+' timezone checks passed.');
