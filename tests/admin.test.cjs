'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CODE=['Code.gs','Email.gs','Settings.gs','Admin.gs'].map(n=>fs.readFileSync(path.join(__dirname,'../backend',n),'utf8')).join('\n');
const hashBytes=s=>Array.from(crypto.createHash('sha256').update(s).digest());
(function(){

const reports=[];function check(n,v){if(!v)throw Error(n);reports.push(n);}function rejects(n,fn,pattern){let err;try{fn();}catch(e){err=e;}check(n,!!err&&(!pattern||pattern.test(err.message)));}
function fixture(){
 const props=new Map(),cache=new Map(),books={},sent=[];let user='jamilaexim786vector@gmail.com',uid=0,opens=0,failWrite=false;
 function sheet(name,data){let rows=data.map(r=>r.slice());const s={name,rows,getName:()=>name,getLastRow:()=>rows.length,getMaxRows:()=>1000,getMaxColumns:()=>30,insertRowsAfter(){},insertColumnsAfter(){},setFrozenRows(){},setFrozenColumns(){},setRowHeight(){},getFilter:()=>true,getSheetId:()=>1,getRange(r,c,n,w){const range={getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),getDisplayValues:()=>range.getValues().map(row=>row.map(String)),getFormulas:()=>Array.from({length:n},()=>Array(w).fill('')),getNumberFormats:()=>Array.from({length:n},()=>Array(w).fill('yyyy-mm-dd hh:mm:ss')),setNumberFormats(){return range;},setNumberFormat(){return range;},setValues(vals){if(failWrite)throw Error('write failed');vals.forEach((row,i)=>{rows[r-1+i]??=[];row.forEach((v,j)=>rows[r-1+i][c-1+j]=v);});return range;},setBackground(){return range;},setFontWeight(){return range;},setWrap(){return range;},createFilter(){return range;}};return range;}};return s;}
 function book(id,schemas=true){const tabs={},b={id,tabs,zone:'Asia/Kolkata',getName:()=>id,getUrl:()=>'https://docs.google.com/spreadsheets/d/'+id,getSpreadsheetTimeZone:()=>b.zone,setSpreadsheetTimeZone:z=>b.zone=z,getSheets:()=>Object.values(tabs),getSheetByName:n=>tabs[n]||null,insertSheet:n=>tabs[n]=sheet(n,[])};books[id]=b;if(schemas)api.adminSpecs_().forEach(s=>tabs[s.name]=sheet(s.name,[s.headers]));return b;}
 const api=new Function('Session','CacheService','PropertiesService','SpreadsheetApp','Utilities','LockService','MailApp','ScriptApp','HtmlService',CODE+';return {adminSpecs_,adminBootstrap,adminConnection,adminOverview,adminListRecords,adminGetRecord,adminUpdateRecord,adminNotifications,adminTestDestination,adminPrepareDestination,adminPreviewMigration,adminActivateDestination,adminSaveIntegration,adminApplyIndianTime,adminPage_,activeSpreadsheetId_,backendSettings_,spreadsheetId_,webAppUrl_,saveSubmission_,storedEmailRecord_,schema:JEBG_SCHEMA,email:JEBG_EMAIL};')(
 {getActiveUser:()=>({getEmail:()=>user})},
 {getUserCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)}),getScriptCache:()=>({get:()=>null,put(){}})},
 {getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},
 {openById:id=>{opens++;if(!books[id])throw Error('unavailable book');return books[id];},flush(){}},
 {getUuid:()=>'uuid-'+(++uid),computeDigest:(_,s)=>hashBytes(s),DigestAlgorithm:{SHA_256:'sha'},Charset:{UTF_8:'utf8'},formatDate:()=> '2026-11-06'},
 {getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 {getRemainingDailyQuota:()=>100,sendEmail:m=>sent.push(m)},
 {getProjectTriggers:()=>[],getService:()=>({getUrl:()=>''})},
 {createHtmlOutput:html=>({html,setTitle(){return this;}}),createHtmlOutputFromFile:()=>({html:'private',setTitle(){return this;}})}
 );
 const source=book('1KqIlgyfKgGCdc-ZwRT0NF1f6WeJkKJV7WQ5mSZHHeJQ'),target=book('destination_12345678901234567890');
 function record(kind,id='REF-'+kind){const schema=api.schema[kind],r=schema.headers.map(()=> '');r[0]=id;r[1]=new Date('2026-11-06T00:00:00Z');schema.fields.forEach((k,i)=>r[i+2]=({name:'Test Person',email:'person@example.com',company:'Test Company',product:'JEBG VisionAI — SafetyWatch',specialisation:'Developer'}[k]||k));r[schema.headers.indexOf('Status')]='New';r[schema.headers.indexOf('Updates Opt-in')]=true;r[schema.headers.indexOf('Consent Text')]='Original explicit consent';source.tabs[schema.tab].rows.push(r);return r;}
 return {api,props,cache,source,target,books,book,record,sent,setUser:v=>user=v,setFail:v=>failWrite=v,getOpens:()=>opens};
}
{
 const f=fixture();check('default sheet preserved',f.api.activeSpreadsheetId_()===f.source.id);
 const protectedCalls=['adminApplyIndianTime','adminConnection','adminOverview','adminListRecords','adminGetRecord','adminUpdateRecord','adminNotifications','adminTestDestination','adminPrepareDestination','adminPreviewMigration','adminActivateDestination','adminSaveIntegration'];
 for(const identity of ['', 'other@example.com']){f.setUser(identity);for(const name of protectedCalls)rejects('deny '+name+' for '+(identity||'anonymous'),()=>f.api[name]('forged'),/Access denied/);rejects('deny bootstrap '+identity,()=>f.api.adminBootstrap(),/Access denied/);check('denied page contains no data '+identity,f.api.adminPage_().html!=='private');}
 check('unauthorized calls never open spreadsheet',f.getOpens()===0);
 f.setUser('jamilaexim786vector@gmail.com');rejects('expired token denied',()=>f.api.adminOverview('expired'),/expired/);
 const boot=f.api.adminBootstrap();check('owner boot returns session',!!boot.token);check('owner page allowed',f.api.adminPage_().html==='private');
 f.props.set('JEBG_BACKEND_SETTINGS_V1','{"revision":0,"spreadsheetId":"bad"}');rejects('invalid settings fail closed',()=>f.api.activeSpreadsheetId_(),/invalid/);
}
{
 const f=fixture(),customer=f.record('customer'),expert=f.record('expert'),token=f.api.adminBootstrap().token;
 const view=f.api.adminOverview(token);check('actual totals from both tabs',view.counts.customer===1&&view.counts.expert===1);check('RPC dates serialized',typeof view.recent[0].submittedAt==='string');
 check('search and product preserved',f.api.adminListRecords(token,{search:'SafetyWatch'}).records[0].product==='JEBG VisionAI — SafetyWatch');
 const detail=f.api.adminGetRecord(token,'customer',customer[0]),before=customer.slice();f.api.adminUpdateRecord(token,{kind:'customer',reference:customer[0],fingerprint:detail.fingerprint,status:'Contacted',notes:'=unsafe'});
 check('submitted fields and consent preserved',before.slice(0,16).every((x,i)=>x===customer[i]));check('notes formula escaped',customer[17]==="'=unsafe");check('only status notes timestamp editable',customer[16]==='Contacted'&&customer[18] instanceof Date);
 rejects('stale record rejected',()=>f.api.adminUpdateRecord(token,{kind:'customer',reference:customer[0],fingerprint:detail.fingerprint,status:'Closed',notes:''}),/changed/);
 rejects('unknown status rejected',()=>f.api.adminUpdateRecord(token,{status:'Invented',notes:''}),/valid/);
 rejects('external endpoint refused',()=>f.api.webAppUrl_('https://evil.example/exec'),/Google/);
 rejects('invalid sheet refused',()=>f.api.spreadsheetId_('not an id'),/valid/);
 check('detail RPC serializable',!!JSON.stringify(f.api.adminGetRecord(token,'expert',expert[0])));
}
{
 const f=fixture();f.record('customer');f.record('expert');const q=f.email=f.api.email;
 f.source.tabs[q.sheet].rows.push(['REF-customer','customer','acknowledgement','person@example.com','Sent',1,new Date('2026-11-06T00:00:00Z'),new Date('2026-11-06T00:00:01Z'),'']);
 const token=f.api.adminBootstrap().token,before=JSON.stringify(f.source.tabs),targetBefore=JSON.stringify(f.target.tabs);
 check('destination test compatible',f.api.adminTestDestination(token,f.target.id).compatible);check('test is read only',JSON.stringify(f.target.tabs)===targetBefore);
 const plan=f.api.adminPreviewMigration(token,f.target.id);check('preview includes both forms and outbox',plan.tables.length===3&&plan.tables.every(t=>t.rowsToCopy===1));
 rejects('typed confirmation required',()=>f.api.adminActivateDestination(token,{...plan,confirmation:'wrong'}),/exact/);
 const connection=f.api.adminActivateDestination(token,{...plan,confirmation:f.target.id});
 check('verified target activated',connection.spreadsheetId===f.target.id&&connection.previousSpreadsheetId===f.source.id);
 check('source intact after migration',JSON.stringify(f.source.tabs)===before);
 check('all rows and timestamps copied',Object.keys(f.source.tabs).every(k=>JSON.stringify(f.source.tabs[k].rows)===JSON.stringify(f.target.tabs[k].rows)));
 check('sent queue remains sent',f.target.tabs[q.sheet].rows[1][4]==='Sent');check('migration sends no emails',f.sent.length===0);
 check('subsequent active routing uses target',f.api.activeSpreadsheetId_()===f.target.id);
 const back=f.api.adminPreviewMigration(token,f.source.id);check('rollback preview does not duplicate',back.tables.every(t=>t.rowsToCopy===0));
}
{
 const f=fixture(),row=f.record('customer'),token=f.api.adminBootstrap().token,p=f.api.adminPreviewMigration(token,f.target.id);
 row[2]='Changed';rejects('stale migration rejected',()=>f.api.adminActivateDestination(token,{...p,confirmation:f.target.id}),/changed/);check('stale plan leaves active unchanged',f.api.activeSpreadsheetId_()===f.source.id);
 f.target.tabs['Customer Enquiries'].rows.push(row.map((v,i)=>i===2?'Conflict':v));check('conflicting reference blocks migration',!f.api.adminPreviewMigration(token,f.target.id).canActivate);
}
{
 const f=fixture(),row=f.record('customer'),token=f.api.adminBootstrap().token;row[2]='=FORMULA()';check('formula-like source blocks migration',!f.api.adminPreviewMigration(token,f.target.id).canActivate);
}
{
 const f=fixture();f.record('customer');const token=f.api.adminBootstrap().token,p=f.api.adminPreviewMigration(token,f.target.id);f.setFail(true);
 rejects('copy failure handled',()=>f.api.adminActivateDestination(token,{...p,confirmation:f.target.id}),/write failed/);check('copy failure retains source connection',f.api.activeSpreadsheetId_()===f.source.id);
}
{
 const f=fixture(),token=f.api.adminBootstrap().token,q=f.api.email;f.source.tabs[q.sheet].rows.push(['REF','customer','admin','owner@example.com','Sending']);check('in-flight email blocks activation',!f.api.adminPreviewMigration(token,f.target.id).canActivate);
}
{
 const f=fixture(),token=f.api.adminBootstrap().token,b=f.book('unprepared_12345678901234567890',false);b.zone='Etc/UTC';
 rejects('timezone change requires confirmation',()=>f.api.adminPrepareDestination(token,b.id,false),/Confirm/);
 check('prepare creates compatible destination',f.api.adminPrepareDestination(token,b.id,true).compatible);check('prepare does not activate',f.api.activeSpreadsheetId_()===f.source.id);
 f.target.tabs['Customer Enquiries'].rows[0][0]='Wrong';const snap=JSON.stringify(f.target.tabs);rejects('incompatible headers preserved',()=>f.api.adminPrepareDestination(token,f.target.id,false),/headers differ/);check('no mutations on header mismatch',JSON.stringify(f.target.tabs)===snap);
}

{
 const f=fixture(),token=f.api.adminBootstrap().token;
 rejects('IST change requires confirmation',()=>f.api.adminApplyIndianTime(token,false),/Confirm/);
 const row=f.record('customer'),instant=row[1].getTime(),snapshot=row.slice();
 const connection=f.api.adminApplyIndianTime(token,true);
 check('owner can apply IST',connection.timezone==='Asia/Kolkata');
 check('IST keeps request content and instants',row.every((v,i)=>v instanceof Date?v.getTime()===snapshot[i].getTime():v===snapshot[i])&&row[1].getTime()===instant);
 f.api.adminApplyIndianTime(token,true);
 check('repeated IST application does not shift timestamps',row[1].getTime()===instant);
}
console.log(reports.length+' admin checks passed.');
return reports;

})();
