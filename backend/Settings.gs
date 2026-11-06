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
