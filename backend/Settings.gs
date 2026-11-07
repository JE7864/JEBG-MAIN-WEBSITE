/** Runtime storage settings. Defaults preserve the current deployment. */
const JEBG_SETTINGS_KEY = 'JEBG_BACKEND_SETTINGS_V1';
const JEBG_DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyfyt1mkqeaUgLu0b-nKTYIUXi4CvJn3GXwfyb7aU5WFbS-cbtf3ef1AYrQ6J_vcaVu/exec';
function backendSettings_() {
 const raw=PropertiesService.getScriptProperties().getProperty(JEBG_SETTINGS_KEY);
 if(!raw)return {revision:0,spreadsheetId:JEBG_CONFIG.spreadsheetId,previousSpreadsheetId:'',publicWebAppUrl:JEBG_DEFAULT_ENDPOINT,adminWebAppUrl:'',audit:[]};
 const s=JSON.parse(raw);
 if(!s || !/^[A-Za-z0-9_-]{20,150}$/.test(s.spreadsheetId)||!Number.isInteger(s.revision))throw new Error('Backend settings are invalid. Owner review is required.');
 return s;
}
function activeSpreadsheetId_(){return backendSettings_().spreadsheetId;}
function spreadsheetId_(value){
 const text=String(value||'').trim(),match=text.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,150})(?:\/[^ ]*)?$/);
 const id=match?match[1]:text;
 if(!/^[A-Za-z0-9_-]{20,150}$/.test(id))throw new Error('Enter a valid Google spreadsheet ID or URL.');
 return id;
}
function webAppUrl_(value,optional){
 const text=String(value||'').trim();
 if(!text&&optional)return '';
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/.test(text))throw new Error('Use a Google Apps Script /exec URL without query parameters.');
 return text;
}

/** IST presentation; Date values remain real instants, never manually offset by 5:30. */
const JEBG_TIME_ZONE='Asia/Kolkata';
function headerMatches_(actual,expected){
 return actual===expected || (/ IST$/.test(expected)&&actual===expected.replace(/ IST$/,' UTC'));
}
function indianTimeZone_(zone){return zone==='Asia/Kolkata'||zone==='Asia/Calcutta';}
/** Called only while the shared script lock is held. Does not touch request fields. */
function applyIndianTime_(book){
 const oldZone=book.getSpreadsheetTimeZone();
 if(oldZone!=='Etc/UTC'&&oldZone!=='UTC'&&!indianTimeZone_(oldZone))throw new Error('Expected a UTC or Indian-time spreadsheet. Review its existing timezone first.');
 const tables=[];
 adminSpecs_().forEach(function(spec){
  const sheet=book.getSheetByName(spec.name);if(!sheet)throw new Error('Missing tab: '+spec.name);
  const headers=sheet.getRange(1,1,1,spec.headers.length).getDisplayValues()[0];
  if(headers.some(function(v,i){return !headerMatches_(v,spec.headers[i]);}))throw new Error('Headers differ in '+spec.name+'. No changes were made.');
  const count=Math.max(0,sheet.getLastRow()-1);
  if(count>5000)throw new Error('More than 5000 rows in '+spec.name+'. Use a staged timestamp migration.');
  const columns=[];
  spec.headers.forEach(function(h,i){
   if(!/ IST$/.test(h))return;
   if(count&&((/ UTC$/.test(headers[i])&&indianTimeZone_(oldZone))||(/ IST$/.test(headers[i])&&!indianTimeZone_(oldZone))))throw new Error('Timestamp header and workbook timezone disagree in '+spec.name+'. Review before converting.');
   const range=count?sheet.getRange(2,i+1,count,1):null,values=range?range.getValues():[];
   if(range&&range.getFormulas().some(function(r){return r[0];}))throw new Error('Formula in timestamp column '+h+'. No changes were made.');
   if(values.some(function(r){return r[0]!==''&&(!(r[0] instanceof Date)||isNaN(r[0].getTime()));}))throw new Error('Unrecognized timestamp in '+spec.name+' / '+h+'. No changes were made.');
   columns.push({column:i+1,range:range,values:values,formats:range?range.getNumberFormats():[]});
  });
  tables.push({sheet:sheet,headers:headers,spec:spec,columns:columns});
 });
 try{
  // Read Dates under the original timezone, then write the same instants under IST.
  book.setSpreadsheetTimeZone(JEBG_TIME_ZONE);
  tables.forEach(function(t){
   t.columns.forEach(function(c){
    if(c.range){c.range.setValues(c.values);c.range.setNumberFormat('yyyy-mm-dd hh:mm:ss "IST"');}
    t.sheet.getRange(1,c.column,1,1).setValues([[t.spec.headers[c.column-1]]]);
   });
  });
  SpreadsheetApp.flush();
  tables.forEach(function(t){t.columns.forEach(function(c){if(!c.range)return;const actual=c.range.getValues();if(actual.some(function(r,i){const old=c.values[i][0];return old===''?r[0]!=='':!(r[0] instanceof Date)||Math.abs(r[0].getTime()-old.getTime())>1;}))throw new Error('Timestamp verification failed.');});});
 }catch(error){
  try{
   book.setSpreadsheetTimeZone(oldZone);
   tables.forEach(function(t){t.columns.forEach(function(c){if(c.range){c.range.setValues(c.values);c.range.setNumberFormats(c.formats);}t.sheet.getRange(1,c.column,1,1).setValues([[t.headers[c.column-1]]]);});});
   SpreadsheetApp.flush();
  }catch(rollbackError){throw new Error('Timestamp conversion and rollback could not complete. Stop submissions and restore the spreadsheet backup before retrying.');}
  throw new Error('Timestamp conversion was rolled back: '+error.message);
 }
 return 'Indian Standard Time (UTC+05:30) applied; original timestamp instants preserved.';
}
