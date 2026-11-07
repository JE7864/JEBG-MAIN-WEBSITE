/** Public aggregate footer metrics. Never exposes request contents or admin settings. */
const JEBG_VISIT_KEY='JEBG_PUBLIC_VISITS_V1';
function publicStatsDay_(now){return Utilities.formatDate(now,'Asia/Kolkata','yyyy-MM-dd');}
function publicVisitState_(){
 const raw=PropertiesService.getScriptProperties().getProperty(JEBG_VISIT_KEY);
 if(!raw)return null;
 const s=JSON.parse(raw);
 if(!s||!Number.isSafeInteger(s.total)||s.total<0||typeof s.startedOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s.startedOn)||!Number.isFinite(Date.parse(s.startedOn+'T00:00:00Z')))throw new Error('Visit counter needs owner review.');
 return s;
}
function publicRecordVisit_(id,now){
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return false;
 const lock=LockService.getScriptLock();if(!lock.tryLock(3000))return false;
 try{
  const cache=CacheService.getScriptCache(),key='public-visit:'+id;
  if(cache.get(key))return true;
  const day=publicStatsDay_(now),state=publicVisitState_()||{total:0,startedOn:day};
  if(state.startedOn>day||state.total>=Number.MAX_SAFE_INTEGER)return false;
  state.total++;
  PropertiesService.getScriptProperties().setProperty(JEBG_VISIT_KEY,JSON.stringify(state));
  // Best-effort retry deduplication; CacheService may evict entries early.
  try{cache.put(key,'1',21600);}catch(ignore){}
  return true;
 }finally{lock.releaseLock();}
}
function publicVisitResponse_(e){
 let ok=false;try{ok=publicRecordVisit_(e.parameter.visitId,new Date());}catch(ignore){}
 return ContentService.createTextOutput(JSON.stringify({ok:ok})).setMimeType(ContentService.MimeType.JSON);
}
function publicFormTotals_(){
 const id=activeSpreadsheetId_(),cache=CacheService.getScriptCache(),key='public-form-totals-v1:'+id;
 const raw=cache.get(key);
 if(raw){const c=JSON.parse(raw);if(Number.isSafeInteger(c.customer)&&c.customer>=0&&Number.isSafeInteger(c.expert)&&c.expert>=0)return c;}
 const book=SpreadsheetApp.openById(id),totals={customer:0,expert:0};
 Object.keys(JEBG_SCHEMA).forEach(function(kind){
  const schema=JEBG_SCHEMA[kind],sheet=book.getSheetByName(schema.tab);
  if(!sheet)throw new Error('Missing records tab.');
  assertHeaders_(sheet,schema);
  const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues():[];
  totals[kind]=new Set(rows.map(function(r){return String(r[0]||'').trim();}).filter(Boolean)).size;
 });
 try{cache.put(key,JSON.stringify(totals),60);}catch(ignore){}
 return totals;
}
function publicStatsData_(now){
 const state=publicVisitState_(),totals=publicFormTotals_(),today=publicStatsDay_(now);
 if(state&&state.startedOn>today)throw new Error('Invalid counter start date.');
 const days=state?Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse(state.startedOn+'T00:00:00Z'))/86400000)+1:1;
 return {schemaVersion:1,totalVisits:state?state.total:0,averageDailyVisits:state?Math.round(state.total/days*10)/10:0,customerSubmissions:totals.customer,developerSubmissions:totals.expert,startedOn:state?state.startedOn:today};
}
function publicStatsResponse_(){
 let data;try{data=publicStatsData_(new Date());}catch(ignore){data={schemaVersion:1,unavailable:true};}
 // Fixed callback, read-only GET, numbers/date only. No caller-supplied JavaScript.
 return ContentService.createTextOutput('typeof window.jebgFooterStats==="function"&&window.jebgFooterStats('+JSON.stringify(data)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
