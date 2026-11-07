/** Owner-only admin RPCs. No private data is returned without active-user verification. */
const JEBG_ADMIN_OWNER = 'jamilaexim786vector@gmail.com';
const JEBG_ADMIN_STATUSES = ['New','Contacted','Discussion','Proposal','Closed','Do not contact'];
function adminOwner_(){
 let email='';try{email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();}catch(e){}
 if(email!==JEBG_ADMIN_OWNER)throw new Error('Access denied. Open the private admin deployment and sign in with the authorized JEBG owner account.');
 return email;
}
function adminRequire_(token){
 const owner=adminOwner_();
 if(typeof token!=='string'||!CacheService.getUserCache().get('jebg-admin:'+token))throw new Error('Your admin session expired. Reload the secure workspace.');
 return owner;
}
function adminLock_(fn){
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(15000))throw new Error('The workspace is busy. Please try again.');
 try{return fn();}finally{lock.releaseLock();}
}
function adminAudit_(state,actor,action,target){
 const next=Object.assign({},state);
 next.revision=state.revision+1;
 next.audit=[{at:new Date().toISOString(),actor:actor,action:action,target:String(target||'').slice(0,150)}].concat(state.audit||[]).slice(0,15);
 while(JSON.stringify(next).length>7500&&next.audit.length>1)next.audit.pop();
 PropertiesService.getScriptProperties().setProperty(JEBG_SETTINGS_KEY,JSON.stringify(next));
 return next;
}
function adminPage_(){
 try{adminOwner_();return HtmlService.createHtmlOutputFromFile('Admin').setTitle('JEBG | Owner workspace');}
 catch(e){return HtmlService.createHtmlOutput('<!doctype html><html><head><base target="_top"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#07131e;color:#eaf4fc;font:16px/1.8 Arial;padding:40px"><main style="max-width:600px;margin:50px auto"><p style="color:#4ad9eb">JEBG OWNER WORKSPACE</p><h1>Authorized access required.</h1><p>Use the private admin deployment and sign in with the JEBG owner account. This page has not loaded any private records.</p></main></body></html>').setTitle('JEBG | Authorized access required');}
}
function adminBootstrap(){
 const owner=adminOwner_(),token=Utilities.getUuid();
 CacheService.getUserCache().put('jebg-admin:'+token,'1',1800);
 return {token:token,owner:owner,statuses:JEBG_ADMIN_STATUSES,connection:adminConnectionData_()};
}
function adminConnectionData_(){
 const s=backendSettings_(),book=SpreadsheetApp.openById(s.spreadsheetId);
 let quota=null,worker=false,adminUrl='';
 try{quota=MailApp.getRemainingDailyQuota();}catch(e){}
 try{worker=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='retryJebgEmails_';});}catch(e){}
 try{adminUrl=ScriptApp.getService().getUrl()||'';}catch(e){}
 return {revision:s.revision,spreadsheetId:s.spreadsheetId,previousSpreadsheetId:s.previousSpreadsheetId||'',title:book.getName(),url:book.getUrl(),timezone:book.getSpreadsheetTimeZone(),publicWebAppUrl:s.publicWebAppUrl||JEBG_DEFAULT_ENDPOINT,adminWebAppUrl:s.adminWebAppUrl||adminUrl,emailEnabled:PropertiesService.getScriptProperties().getProperty(JEBG_EMAIL.flag)==='true',remainingRecipients:quota,retryWorker:worker,audit:s.audit||[]};
}
function adminConnection(token){adminRequire_(token);return adminConnectionData_();}
function adminRows_(book,kind){
 const schema=JEBG_SCHEMA[kind];if(!schema)throw new Error('Unknown request type.');
 const sheet=book.getSheetByName(schema.tab);if(!sheet)throw new Error('Missing tab: '+schema.tab);
 assertHeaders_(sheet,schema);
 return {schema:schema,sheet:sheet,rows:sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,schema.headers.length).getValues():[]};
}
function adminValue_(value){return value instanceof Date?(isNaN(value.getTime())?'':value.toISOString()):value==null?'':value;}
function adminRowHash_(row){return sha256_(JSON.stringify(row.map(adminValue_)));}
function adminFind_(data,reference){
 const index=data.rows.findIndex(function(r){return String(r[0])===String(reference);});
 if(index<0)throw new Error('Request not found. Refresh the list.');
 return {row:data.rows[index],index:index};
}
function adminBrief_(kind,schema,row){
 const get=function(key){return adminValue_(row[2+schema.fields.indexOf(key)]);};
 return {reference:String(row[0]),kind:kind,name:get('name'),email:get('email'),context:kind==='customer'?get('company'):get('specialisation'),product:kind==='customer'?get('product'):get('engagement'),submittedAt:adminValue_(row[1]),status:String(row[schema.headers.indexOf('Status')]||'New')};
}
function adminOverview(token){
 adminRequire_(token);
 const book=SpreadsheetApp.openById(activeSpreadsheetId_()),all=[];
 const counts={customer:0,expert:0,needsFollowUp:0,newRequests:0,pendingEmails:0,reviewEmails:0,sentEmails:0};
 Object.keys(JEBG_SCHEMA).forEach(function(kind){const d=adminRows_(book,kind);d.rows.filter(function(r){return r[0];}).forEach(function(r){const item=adminBrief_(kind,d.schema,r);counts[kind]++;if(item.status==='New')counts.newRequests++;if(['New','Contacted','Discussion','Proposal'].indexOf(item.status)>=0)counts.needsFollowUp++;all.push(item);});});
 const queue=book.getSheetByName(JEBG_EMAIL.sheet);
 if(queue&&queue.getLastRow()>1)queue.getRange(2,1,queue.getLastRow()-1,JEBG_EMAIL.headers.length).getValues().forEach(function(r){if(r[4]==='Pending')counts.pendingEmails++;if(r[4]==='Needs review'||r[4]==='Sending')counts.reviewEmails++;if(r[4]==='Sent')counts.sentEmails++;});
 all.sort(function(a,b){return (Date.parse(b.submittedAt)||0)-(Date.parse(a.submittedAt)||0);});
 return {counts:counts,recent:all.slice(0,8),updatedAt:new Date().toISOString()};
}
function adminListRecords(token,query){
 adminRequire_(token);query=query||{};
 const kind=query.kind==='expert'?'expert':'customer',d=adminRows_(SpreadsheetApp.openById(activeSpreadsheetId_()),kind);
 const search=String(query.search||'').trim().toLowerCase().slice(0,120),status=String(query.status||'');
 if(status&&JEBG_ADMIN_STATUSES.indexOf(status)<0)throw new Error('Invalid status filter.');
 let rows=d.rows.filter(function(r){return r[0]&&(!status||r[d.schema.headers.indexOf('Status')]===status)&&(!search||r.some(function(v){return String(v).toLowerCase().indexOf(search)>=0;}));}).map(function(r){return adminBrief_(kind,d.schema,r);});
 rows.sort(function(a,b){return (Date.parse(b.submittedAt)||0)-(Date.parse(a.submittedAt)||0);});
 const page=Math.max(1,Math.floor(Number(query.page)||1)),size=20;
 return {records:rows.slice((page-1)*size,page*size),page:page,pageSize:size,total:rows.length};
}
function adminRecordData_(kind,reference){
 const d=adminRows_(SpreadsheetApp.openById(activeSpreadsheetId_()),kind),found=adminFind_(d,reference),row=found.row;
 return {reference:String(row[0]),kind:kind,name:String(row[2]||''),submittedAt:adminValue_(row[1]),status:String(row[d.schema.headers.indexOf('Status')]||'New'),notes:String(row[d.schema.headers.indexOf('Notes')]||''),fingerprint:adminRowHash_(row),fields:d.schema.fields.map(function(k,i){return {label:d.schema.labels[i],value:adminValue_(row[i+2])};}),updatesOptIn:row[d.schema.headers.indexOf('Updates Opt-in')]===true};
}
function adminGetRecord(token,kind,reference){adminRequire_(token);return adminRecordData_(kind,String(reference||''));}
function adminUpdateRecord(token,input){
 const owner=adminRequire_(token);input=input||{};
 if(JEBG_ADMIN_STATUSES.indexOf(input.status)<0)throw new Error('Select a valid request status.');
 if(typeof input.notes!=='string'||input.notes.length>4000)throw new Error('Notes must be 4000 characters or fewer.');
 return adminLock_(function(){
  const d=adminRows_(SpreadsheetApp.openById(activeSpreadsheetId_()),input.kind),found=adminFind_(d,input.reference);
  if(adminRowHash_(found.row)!==input.fingerprint)throw new Error('This request changed. Reload it before saving.');
  const col=d.schema.headers.indexOf('Status')+1;
  d.sheet.getRange(found.index+2,col,1,3).setValues([[input.status,literal_(input.notes),new Date()]]);
  SpreadsheetApp.flush();
  adminAudit_(backendSettings_(),owner,'Updated request status/notes',input.reference);
  return adminRecordData_(input.kind,input.reference);
 });
}
function adminNotifications(token,search){
 adminRequire_(token);
 const book=SpreadsheetApp.openById(activeSpreadsheetId_()),sheet=book.getSheetByName(JEBG_EMAIL.sheet),term=String(search||'').toLowerCase().slice(0,120);
 if(!sheet||sheet.getLastRow()<2)return [];
 return sheet.getRange(2,1,sheet.getLastRow()-1,JEBG_EMAIL.headers.length).getValues().filter(function(r){return r[0]&&(!term||r.some(function(v){return String(v).toLowerCase().indexOf(term)>=0;}));}).slice(-100).reverse().map(function(r){return {reference:String(r[0]),kind:r[1],role:r[2],recipient:r[3],status:r[4],attempts:r[5],lastAttempt:adminValue_(r[6]),sentAt:adminValue_(r[7]),error:String(r[8]||'')};});
}
function adminSpecs_(){return Object.keys(JEBG_SCHEMA).map(function(k){return {name:JEBG_SCHEMA[k].tab,headers:JEBG_SCHEMA[k].headers,kind:k};}).concat([{name:JEBG_EMAIL.sheet,headers:JEBG_EMAIL.headers,kind:'email'}]);}
function adminSnapshot_(book){
 return adminSpecs_().map(function(spec){
  const sheet=book.getSheetByName(spec.name);if(!sheet)throw new Error('Prepare the destination: missing '+spec.name+'.');
  const headers=sheet.getRange(1,1,1,spec.headers.length).getDisplayValues()[0];
  if(headers.some(function(v,i){return !headerMatches_(v,spec.headers[i]);}))throw new Error('Headers do not match in '+spec.name+'. No existing headers will be overwritten.');
  const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,spec.headers.length).getValues().filter(function(r){return r[0];}):[];
  const keys={};rows.forEach(function(r){const key=String(r[0])+(spec.kind==='email'?'|'+String(r[2]):'');if(keys[key])throw new Error('Duplicate reference in '+spec.name+'.');keys[key]=true;});
  return {spec:spec,sheet:sheet,rows:rows};
 });
}
function adminMigrationPlan_(source,target,state,targetId){
 const tables=[],conflicts=[];
 source.forEach(function(src,i){
  const dst=target[i],index={};dst.rows.forEach(function(r){index[String(r[0])+(src.spec.kind==='email'?'|'+r[2]:'')]=r;});
  let missing=0;
  if(src.rows.some(function(r){return r.some(function(v){return typeof v==='string' && /^\s*=/.test(v);});}))conflicts.push(src.spec.name+': formula-like cell text requires owner review before copying.');
  src.rows.forEach(function(r){const key=String(r[0])+(src.spec.kind==='email'?'|'+r[2]:''),old=index[key];if(!old)missing++;else if(adminRowHash_(old)!==adminRowHash_(r))conflicts.push(src.spec.name+': '+String(r[0]));});
  if(src.spec.kind==='email'&&src.rows.concat(dst.rows).some(function(r){return r[4]==='Sending';}))conflicts.push('A source email attempt is still marked Sending. Resolve it before migration.');
  tables.push({name:src.spec.name,sourceRows:src.rows.length,destinationRows:dst.rows.length,rowsToCopy:missing});
 });
 const digest=function(snap){return snap.map(function(t){return [t.spec.name,t.rows.map(function(r){return r.map(adminValue_);})];});};
 return {targetId:targetId,revision:state.revision,tables:tables,conflicts:conflicts.slice(0,30),canActivate:conflicts.length===0,planHash:sha256_(JSON.stringify([state.revision,state.spreadsheetId,targetId,digest(source),digest(target)]))};
}
function adminTestDestination(token,value){
 adminRequire_(token);const id=spreadsheetId_(value),book=SpreadsheetApp.openById(id);
 const tabs=book.getSheets().map(function(s){return s.getName();});
 let compatible=true,issues=[];
 adminSpecs_().forEach(function(spec){const sheet=book.getSheetByName(spec.name);if(!sheet){compatible=false;issues.push('Missing '+spec.name);return;}if(sheet.getLastRow()===0){compatible=false;issues.push('Empty '+spec.name);return;}const h=sheet.getRange(1,1,1,spec.headers.length).getDisplayValues()[0];if(h.some(function(v,i){return !headerMatches_(v,spec.headers[i]);})){compatible=false;issues.push('Different headers in '+spec.name);}});
 if(!indianTimeZone_(book.getSpreadsheetTimeZone())){compatible=false;issues.push('Destination timezone must be Indian Standard Time (Asia/Kolkata).');}
 return {id:id,title:book.getName(),url:book.getUrl(),timezone:book.getSpreadsheetTimeZone(),tabs:tabs,compatible:compatible,issues:issues,alreadyActive:id===activeSpreadsheetId_()};
}
function adminPrepareDestination(token,value,confirmIST){
 const owner=adminRequire_(token),id=spreadsheetId_(value);
 return adminLock_(function(){
  if(id===activeSpreadsheetId_())throw new Error('This spreadsheet is already active.');
  const book=SpreadsheetApp.openById(id);
  if(!indianTimeZone_(book.getSpreadsheetTimeZone())&&confirmIST!==true)throw new Error('Confirm the IST timezone change before preparing this destination.');
  // Validate every existing managed tab before creating any missing tabs.
  adminSpecs_().forEach(function(spec){const sheet=book.getSheetByName(spec.name);if(sheet&&sheet.getLastRow()>0){const h=sheet.getRange(1,1,1,spec.headers.length).getDisplayValues()[0];if(h.some(function(v,i){return !headerMatches_(v,spec.headers[i]);}))throw new Error('Existing headers differ in '+spec.name+'. Nothing was overwritten.');}});
  // Conversion runs after all missing tabs have been prepared.
  adminSpecs_().forEach(function(spec){
   let sheet=book.getSheetByName(spec.name);if(!sheet)sheet=book.insertSheet(spec.name);
   if(sheet.getMaxColumns()<spec.headers.length)sheet.insertColumnsAfter(sheet.getMaxColumns(),spec.headers.length-sheet.getMaxColumns());
   if(sheet.getLastRow()===0)sheet.getRange(1,1,1,spec.headers.length).setValues([spec.headers]);
   sheet.setFrozenRows(1);sheet.setFrozenColumns(1);
   sheet.getRange(1,1,1,spec.headers.length).setBackground('#eeeeee').setFontWeight('bold').setWrap(true);
   sheet.setRowHeight(1,44);
   if(!sheet.getFilter())sheet.getRange(1,1,sheet.getMaxRows(),spec.headers.length).createFilter();
  });
  applyIndianTime_(book);SpreadsheetApp.flush();adminAudit_(backendSettings_(),owner,'Prepared destination',id);
  return adminTestDestination(token,id);
 });
}
function adminPreviewMigration(token,value){
 adminRequire_(token);const state=backendSettings_(),id=spreadsheetId_(value);
 if(id===state.spreadsheetId)throw new Error('Choose a different destination.');
 const targetBook=SpreadsheetApp.openById(id);
 if(!indianTimeZone_(targetBook.getSpreadsheetTimeZone()))throw new Error('Prepare the destination with IST timestamps first.');
 return adminMigrationPlan_(adminSnapshot_(SpreadsheetApp.openById(state.spreadsheetId)),adminSnapshot_(targetBook),state,id);
}
function adminActivateDestination(token,input){
 const owner=adminRequire_(token);input=input||{};const id=spreadsheetId_(input.targetId);
 if(input.confirmation!==id)throw new Error('Type the exact destination spreadsheet ID to confirm.');
 return adminLock_(function(){
  const state=backendSettings_();
  if(state.revision!==input.revision||id===state.spreadsheetId)throw new Error('Connection settings changed. Preview the migration again.');
  const sourceBook=SpreadsheetApp.openById(state.spreadsheetId),targetBook=SpreadsheetApp.openById(id);
  if(!indianTimeZone_(targetBook.getSpreadsheetTimeZone()))throw new Error('Destination timezone changed. Prepare it again.');
  const source=adminSnapshot_(sourceBook),target=adminSnapshot_(targetBook),plan=adminMigrationPlan_(source,target,state,id);
  if(plan.planHash!==input.planHash)throw new Error('Records changed since preview. Refresh the migration preview.');
  if(!plan.canActivate)throw new Error('Resolve conflicting records or in-flight email attempts before activation.');
  source.forEach(function(src,i){
   const dst=target[i],keys={};dst.rows.forEach(function(r){keys[String(r[0])+(src.spec.kind==='email'?'|'+r[2]:'')]=true;});
   const missing=src.rows.filter(function(r){return !keys[String(r[0])+(src.spec.kind==='email'?'|'+r[2]:'')];});
   for(let start=0;start<missing.length;start+=250){
    const chunk=missing.slice(start,start+250),last=dst.sheet.getLastRow();
    if(last+chunk.length>dst.sheet.getMaxRows())dst.sheet.insertRowsAfter(dst.sheet.getMaxRows(),last+chunk.length-dst.sheet.getMaxRows());
    dst.sheet.getRange(last+1,1,chunk.length,src.spec.headers.length).setValues(chunk);
   }
  });
  SpreadsheetApp.flush();
  const freshSource=adminSnapshot_(sourceBook),freshTarget=adminSnapshot_(targetBook);
  const before=sha256_(JSON.stringify(source.map(function(t){return t.rows.map(function(r){return r.map(adminValue_);});})));
  const after=sha256_(JSON.stringify(freshSource.map(function(t){return t.rows.map(function(r){return r.map(adminValue_);});})));
  if(before!==after)throw new Error('Source records were edited during migration. The source remains active; preview again.');
  const verified=adminMigrationPlan_(freshSource,freshTarget,state,id);
  if(!verified.canActivate||verified.tables.some(function(t){return t.rowsToCopy!==0;}))throw new Error('Destination verification failed. The source remains active.');
  const next=Object.assign({},state,{previousSpreadsheetId:state.spreadsheetId,spreadsheetId:id});
  adminAudit_(next,owner,'Activated verified destination',id);
  return adminConnectionData_();
 });
}
function adminSaveIntegration(token,input){
 const owner=adminRequire_(token);input=input||{};
 const publicUrl=webAppUrl_(input.publicWebAppUrl,false),adminUrl=webAppUrl_(input.adminWebAppUrl,true);
 return adminLock_(function(){
  const s=backendSettings_();if(s.revision!==input.revision)throw new Error('Settings changed. Reload this page.');
  const next=Object.assign({},s,{publicWebAppUrl:publicUrl,adminWebAppUrl:adminUrl});
  adminAudit_(next,owner,'Saved integration references','Website connection file requires publication for URL changes');
  return adminConnectionData_();
 });
}

function adminApplyIndianTime(token,confirmed){
 const owner=adminRequire_(token);
 if(confirmed!==true)throw new Error('Confirm the active spreadsheet timezone change first.');
 return adminLock_(function(){
  applyIndianTime_(SpreadsheetApp.openById(activeSpreadsheetId_()));
  adminAudit_(backendSettings_(),owner,'Applied Indian Standard Time',activeSpreadsheetId_());
  return adminConnectionData_();
 });
}
