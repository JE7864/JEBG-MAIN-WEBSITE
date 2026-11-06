'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'../backend');
const CODE=fs.readFileSync(path.join(root,'Code.gs'),'utf8')+'\n'+fs.readFileSync(path.join(root,'Email.gs'),'utf8')+'\n'+fs.readFileSync(path.join(root,'Settings.gs'),'utf8');
const reports=[];function check(name,test){if(!test)throw Error(name);reports.push(name);}
function fixture(options={}){
 const db={},sent=[],props=new Map(),triggers=[];let ids=0;
 const status={quota:options.quota===undefined?100:options.quota,failMail:!!options.failMail,failOutbox:!!options.failOutbox,failWrite:false};
 if(options.enabled!==false)props.set('JEBG_EMAIL_ENABLED','true');
 const chain={setBackground(){return this},setFontWeight(){return this},setWrap(){return this},setNumberFormat(){return this},createFilter(){return this}};
 function sheet(name){return {getSheetId:()=>name==='Customer Enquiries'?110001:110002,getLastRow:()=>db[name].length,getMaxRows:()=>1000,insertRowsAfter(){},setFrozenRows(){},setColumnWidth(){},
  getRange:(r,c,n,w)=>({...chain,
   getDisplayValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>String(db[name][r-1+i]?.[c-1+j]??''))),
   getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>db[name][r-1+i]?.[c-1+j]??'')),
   setValues:values=>{if(status.failWrite&&name!=='Email Notifications')throw Error('storage failed');if(status.failOutbox&&name==='Email Notifications')throw Error('queue failed');if(values.length!==n||values.some(x=>x.length!==w))throw Error('range mismatch');values.forEach((row,i)=>{db[name][r-1+i]??=[];row.forEach((v,j)=>db[name][r-1+i][c-1+j]=v)});}
  })};}
 const book={getSheetByName:name=>db[name]?sheet(name):null,insertSheet:name=>{db[name]=[];return sheet(name)}};
 const api=new Function('SpreadsheetApp','LockService','Utilities','PropertiesService','CacheService','HtmlService','MailApp','ScriptApp',CODE+';return {saveSubmission_,doPost,doGet,submissionEmail_,sendQueuedEmails_,validNotificationRecipient_,enableJebgEmails_,retryJebgEmails_,schema:JEBG_SCHEMA,email:JEBG_EMAIL};')(
  {openById:id=>{if(id!=='1KqIlgyfKgGCdc-ZwRT0NF1f6WeJkKJV7WQ5mSZHHeJQ')throw Error('wrong workbook');return book},flush(){}},
  {getScriptLock:()=>({tryLock:()=>!options.busy,releaseLock(){}})},
  {getUuid:()=> 'aaaaaaaa-bbbb-4ccc-8ddd-'+String(++ids).padStart(12,'0'),formatDate:()=> '05 Nov 2026, 02:00 PM',computeDigest:(_,s)=>Array.from(crypto.createHash('sha256').update(s).digest()),DigestAlgorithm:{SHA_256:'sha'},Charset:{UTF_8:'utf8'}},
  {getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},{getScriptCache:()=>({get:()=>null,put(){}})},
  {createHtmlOutput:html=>({html,setTitle(){return this}})},
  {getRemainingDailyQuota:()=>status.quota,sendEmail:message=>{if(!db['Email Notifications'].some(row=>row[0]===message.subject.split(' | ').pop()&&row[4]==='Sending'))throw Error('Send intent not persisted');if(status.failMail)throw Error('mail failed');sent.push(message);status.quota--;}},
  {getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased(){return this},everyMinutes(n){if(n!==5)throw Error('wrong retry cadence');return this},create(){triggers.push({getHandlerFunction:()=>name});}})}
 );
 Object.values(api.schema).forEach(s=>db[s.tab]=[s.headers.slice()]);return {...api,db,sent,status,props,triggers};
}
function input(kind='customer'){return {kind,name:'Example <Customer>',email:'sample@example.com',company:'Example Company',product:'JEBG USSS',location:'India',specialisation:'QA / Deployment',experience:'5 years',portfolio:'https://example.com',availability:'10 hours/week',engagement:'Open to discussion',message:'Line one\n<script>alert(1)</script>',agreement:true,consent:false,requestId:'11111111-2222-4333-8444-555555555555'};}
for(const kind of ['customer','expert']){
 const f=fixture(),d=input(kind),html=f.doPost({parameter:{payload:JSON.stringify(d)}}).html,tab=f.schema[kind].tab;
 check(kind+' request saved before two notifications',f.db[tab].length===2&&f.sent.length===2);
 check(kind+' acknowledgement goes to saved applicant',f.sent[0].to===d.email&&f.sent[0].replyTo==='jamilaexim786vector@gmail.com');
 check(kind+' separate notification goes to owner',f.sent[1].to==='jamilaexim786vector@gmail.com'&&f.sent[1].replyTo===d.email);
 check(kind+' applicant never receives private Sheet link',!f.sent[0].htmlBody.includes('docs.google.com/spreadsheets'));
 check(kind+' owner receives saved-record link',f.sent[1].htmlBody.includes('#gid='));
 check(kind+' HTML and plain-text signatures present',f.sent.every(m=>m.htmlBody.includes('Shekh Aman')&&m.body.includes('IIT Bombay Alumnus')&&m.body.includes('+91 63510 60318')));
 check(kind+' receipt reports sent acknowledgement',html.includes('An acknowledgement has been sent'));
 check(kind+' unsafe HTML is escaped',f.sent.every(m=>!m.htmlBody.includes('<script>alert')&&m.htmlBody.includes('&lt;script&gt;')));
 f.doPost({parameter:{payload:JSON.stringify(d)}});
 check(kind+' retry sends no duplicate messages',f.sent.length===2&&f.db[tab].length===2);
 check(kind+' both email statuses persist',f.db['Email Notifications'].slice(1).every(r=>r[4]==='Sent'&&r[5]===1&&r[7] instanceof Date));
 if(kind==='expert')check('application acknowledgement makes no employment promise',f.sent[0].htmlBody.includes('does not guarantee an assignment or employment'));
}
{
 const f=fixture({quota:0});f.doPost({parameter:{payload:JSON.stringify(input())}});
 check('quota exhaustion preserves request and queues mail',f.db['Customer Enquiries'].length===2&&f.sent.length===0&&f.db['Email Notifications'].slice(1).every(r=>r[4]==='Pending'));
 f.status.quota=10;f.retryJebgEmails_();check('worker sends when quota returns',f.sent.length===2);
 f.retryJebgEmails_();check('worker never repeats successful sends',f.sent.length===2);
}
{
 const f=fixture({failMail:true}),html=f.doPost({parameter:{payload:JSON.stringify(input())}}).html;
 check('mail error does not lose form record',f.db['Customer Enquiries'].length===2&&html.includes('Submission confirmed'));
 check('ambiguous send errors require review',f.db['Email Notifications'].slice(1).every(r=>r[4]==='Needs review'));
 f.status.failMail=false;f.retryJebgEmails_();check('ambiguous sends are not automatically repeated',f.sent.length===0);
 check('receipt never falsely claims delivery',html.includes('Email delivery could not be confirmed')&&!html.includes('An acknowledgement has been sent'));
}
{
 const f=fixture({enabled:false}),html=f.doPost({parameter:{payload:JSON.stringify(input())}}).html;
 check('no mail before owner activation',f.sent.length===0&&html.includes('email is queued'));
 f.enableJebgEmails_();f.enableJebgEmails_();check('setup installs one retry trigger',f.triggers.length===1);
 f.retryJebgEmails_();check('activation releases pending notifications',f.sent.length===2);
}
{
 const f=fixture({failOutbox:true}),html=f.doPost({parameter:{payload:JSON.stringify(input())}}).html;
 check('queue failure preserves saved form',f.db['Customer Enquiries'].length===2&&html.includes('Submission confirmed'));
 f.status.failOutbox=false;f.retryJebgEmails_();check('worker rebuilds missing queue entries',f.sent.length===2);
}
{
 const f=fixture(),result=f.saveSubmission_(input()),queue=f.db['Email Notifications'];queue[1][4]='Sending';queue[1][6]=new Date(Date.now()-700000);
 f.sendQueuedEmails_(result.id,2);check('interrupted send held for review',queue[1][4]==='Needs review'&&f.sent.length===1);
}
{
 const f=fixture();f.status.failWrite=true;const html=f.doPost({parameter:{payload:JSON.stringify(input())}}).html;
 check('storage error sends no email or success receipt',f.sent.length===0&&!html.includes('Submission confirmed'));
}
{
 const f=fixture(),d=input();d.agreement=false;
 check('agreement required before notification',!f.doPost({parameter:{payload:JSON.stringify(d)}}).html.includes('Submission confirmed')&&f.sent.length===0);
 check('invalid JSON sends no email',!f.doPost({parameter:{payload:'broken'}}).html.includes('Submission confirmed')&&f.sent.length===0);
 check('GET never claims a save',!f.doGet().html.includes('Submission confirmed'));
 check('recipient-list injection rejected',!f.validNotificationRecipient_('a,b@example.com')&&!f.validNotificationRecipient_('a@example.com\r\nBcc:x@example.com'));
}
{
 const f=fixture(),d=input();f.saveSubmission_(d);f.db['Customer Enquiries'][1][f.schema.customer.headers.indexOf('Source')]='Google website form';f.db['Email Notifications']=[f.email.headers.slice()];
 f.doPost({parameter:{payload:JSON.stringify(d)}});f.retryJebgEmails_();check('old submissions are not retrospectively emailed',f.sent.length===0);
}
check('activation and worker are private functions',/function enableJebgEmails_\(/.test(CODE)&&/function retryJebgEmails_\(/.test(CODE));
console.log(reports.map(r=>'PASS '+r).join('\n'));console.log(reports.length+' checks passed.');
