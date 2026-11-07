'use strict';
const fs=require('node:fs'),path=require('node:path');
const CODE=['Code.gs','Email.gs','Settings.gs','Metrics.gs'].map(n=>fs.readFileSync(path.join(__dirname,'../backend',n),'utf8')).join('\n');
const reports=[];function check(n,v){if(!v)throw Error(n);reports.push(n);}function rejects(n,fn){let error;try{fn();}catch(e){error=e;}check(n,!!error);}
function fixture(){
 const props=new Map(),cache=new Map(),rows={},reads=[],status={busy:false,missing:false,failWrite:false},schema=new Function(CODE+';return JEBG_SCHEMA;')();
 const active='new_active_sheet_12345678901234567890';
 props.set('JEBG_BACKEND_SETTINGS_V1',JSON.stringify({revision:1,spreadsheetId:active}));
 Object.values(schema).forEach(s=>rows[s.tab]=[]);
 const api=new Function('PropertiesService','CacheService','LockService','Utilities','SpreadsheetApp','ContentService',CODE+';return {publicRecordVisit_,publicStatsData_,publicVisitState_,publicFormTotals_,publicStatsResponse_,publicVisitResponse_,doGet,doPost};')(
 {getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>{if(status.failWrite)throw Error('write failed');props.set(k,v);}})},
 {getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v)})},
 {getScriptLock:()=>({tryLock:()=>!status.busy,releaseLock(){}})},
 {formatDate:(now,zone)=>{if(zone!=='Asia/Kolkata')throw Error('wrong calendar zone');return new Date(now.getTime()+19800000).toISOString().slice(0,10);}},
 {openById:id=>{reads.push(id);if(id!==active)throw Error('wrong active sheet');return {getSheetByName:tab=>status.missing?null:{getLastRow:()=>rows[tab].length+1,getRange:(r,c,n,w)=>{if(r!==1&&(c!==1||w!==1))throw Error('private columns read');return {getDisplayValues:()=>[Object.values(schema).find(s=>s.tab===tab).headers],getValues:()=>rows[tab].map(v=>[v])};}}};}},
 {createTextOutput:body=>({body,setMimeType(type){this.type=type;return this;}}),MimeType:{JSON:'json',JAVASCRIPT:'javascript'}}
 );
 return {api,props,cache,rows,reads,status,active};
}
const id=n=>'aaaaaaaa-bbbb-4ccc-8ddd-'+String(n).padStart(12,'0'),day=new Date('2026-11-07T10:00:00Z');
{
 const f=fixture();f.rows['Customer Enquiries'].push('REF1','REF2','REF2','');f.rows['Developer Applications'].push('DEV1');
 const zero=f.api.publicStatsData_(day);check('historical traffic not invented',zero.totalVisits===0&&zero.averageDailyVisits===0);
 check('counts actual unique saved customer records',zero.customerSubmissions===2);check('counts actual developer records',zero.developerSubmissions===1);
 check('reads configured migrated sheet',f.reads[0]===f.active);
 check('first page visit recorded',f.api.publicRecordVisit_(id(1),day));check('same visit retry acknowledged',f.api.publicRecordVisit_(id(1),day));
 check('retry not double counted',f.api.publicStatsData_(day).totalVisits===1);
 f.api.publicRecordVisit_(id(2),day);const sameDay=f.api.publicStatsData_(day);check('distinct page loads counted',sameDay.totalVisits===2);check('first-day denominator is one',sameDay.averageDailyVisits===2);
 const second=f.api.publicStatsData_(new Date('2026-11-08T10:00:00Z'));check('average includes elapsed calendar days',second.averageDailyVisits===1);
 const keys=Object.keys(sameDay).sort().join(',');check('only aggregate fields returned',keys==='averageDailyVisits,customerSubmissions,developerSubmissions,schemaVersion,startedOn,totalVisits');
 check('no spreadsheet ID or references in response',!JSON.stringify(sameDay).includes(f.active)&&!JSON.stringify(sameDay).includes('REF'));
 const readCount=f.reads.length;f.api.publicFormTotals_();check('form totals cached',f.reads.length===readCount);
 const before=f.props.get('JEBG_PUBLIC_VISITS_V1');f.api.doGet({parameter:{page:'stats',visitId:id(3),callback:'alert(1)'}});
 check('GET does not increment visits',f.props.get('JEBG_PUBLIC_VISITS_V1')===before);
 const response=f.api.doGet({parameter:{page:'stats',callback:'alert(1)'}});check('callback name is fixed',response.body.startsWith('typeof window.jebgFooterStats')&&!response.body.includes('alert(1)'));check('GET returns JavaScript mime type',response.type==='javascript');
}
{
 const f=fixture();check('invalid visit IDs refused',!f.api.publicRecordVisit_('bad',day));check('invalid visit never initializes state',f.api.publicVisitState_()===null);
 f.status.busy=true;check('busy lock refuses visit',!f.api.publicRecordVisit_(id(1),day));check('busy lock does not increment',f.api.publicVisitState_()===null);
}
{
 const f=fixture();f.api.publicRecordVisit_(id(1),new Date('2026-11-07T18:29:00Z'));f.api.publicRecordVisit_(id(2),new Date('2026-11-07T18:31:00Z'));
 const data=f.api.publicStatsData_(new Date('2026-11-07T18:32:00Z'));check('IST midnight starts new calendar day',data.startedOn==='2026-11-07'&&data.averageDailyVisits===1);
}
{
 const f=fixture();f.props.set('JEBG_PUBLIC_VISITS_V1','broken');rejects('corrupt visit state is not silently reset',()=>f.api.publicVisitState_());
 check('public error does not expose internal details',f.api.publicStatsResponse_().body.includes('"unavailable":true')&&!f.api.publicStatsResponse_().body.includes('SyntaxError'));
}
{
 const f=fixture();f.status.failWrite=true;const result=f.api.doPost({parameter:{event:'page_visit',visitId:id(1)}});check('failed counter write returns false',JSON.parse(result.body).ok===false);check('failed write does not fabricate counter state',!f.props.has('JEBG_PUBLIC_VISITS_V1'));
}
{
 const f=fixture();const result=f.api.doPost({parameter:{event:'page_visit',visitId:id(1)}});check('visit event routes independently of forms',JSON.parse(result.body).ok===true);check('visit event never writes form records',Object.values(f.rows).every(r=>r.length===0));check('visit reply contains no private data',result.body==='{"ok":true}');
 f.status.missing=true;check('missing records do not produce fake zero totals',f.api.publicStatsResponse_().body.includes('"unavailable":true'));
}
console.log(reports.length+' legacy metrics checks passed.');
