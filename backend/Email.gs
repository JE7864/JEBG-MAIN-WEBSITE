/** Transactional notifications for JEBG website submissions. */
const JEBG_EMAIL = Object.freeze({
  sheet: 'Email Notifications',
  source: 'Google website form (email enabled)',
  flag: 'JEBG_EMAIL_ENABLED',
  headers: ['Reference','Kind','Recipient Role','Recipient','Status','Attempts','Last Attempt IST','Sent At IST','Error'],
  senderName: 'JEBG AI Technologies | Jamila Exim',
  adminCc: 'work.shekhaman@gmail.com',
  maxBatch: 20
});

/** Owner-only editor setup. Grants send-mail permission and installs a quota retry worker. */
function enableJebgEmails_() {
  const quota = MailApp.getRemainingDailyQuota();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Submission service is busy. Try setup again.');
  try {
    const book = SpreadsheetApp.openById(activeSpreadsheetId_());
    notificationSheet_(book);
    if (!ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction() === 'retryJebgEmails_'; })) {
      ScriptApp.newTrigger('retryJebgEmails_').timeBased().everyMinutes(5).create();
    }
    PropertiesService.getScriptProperties().setProperty(JEBG_EMAIL.flag, 'true');
  } finally { lock.releaseLock(); }
  return 'Automatic transactional emails enabled. Remaining recipient quota: ' + quota;
}

/** Scheduled worker: pending messages only. Ambiguous send failures require owner review. */
function retryJebgEmails_() {
  reconcileSubmissionEmails_();
  return sendQueuedEmails_('', JEBG_EMAIL.maxBatch);
}

function notificationSheet_(book) {
  let sheet = book.getSheetByName(JEBG_EMAIL.sheet);
  if (!sheet) sheet = book.insertSheet(JEBG_EMAIL.sheet);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1,1,1,JEBG_EMAIL.headers.length).setValues([JEBG_EMAIL.headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,JEBG_EMAIL.headers.length).setBackground('#eeeeee').setFontWeight('bold').setWrap(true);
    sheet.setColumnWidth(1,310); sheet.setColumnWidth(4,260); sheet.setColumnWidth(9,350);
    sheet.getRange(2,7,sheet.getMaxRows()-1,2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(1,1,sheet.getMaxRows(),JEBG_EMAIL.headers.length).createFilter();
  }
  const headers = sheet.getRange(1,1,1,JEBG_EMAIL.headers.length).getDisplayValues()[0];
  if (headers.some(function(v,i){return !headerMatches_(v,JEBG_EMAIL.headers[i]);})) throw new Error('Notification headers changed');
  return sheet;
}

/** Called while the submission lock is held. Never queues historical submissions. */
function queueSubmissionEmails_(book, schema, kind, row) {
  if (row[schema.headers.indexOf('Source')] !== JEBG_EMAIL.source) return false;
  const queue = notificationSheet_(book);
  const rows = queue.getLastRow()>1 ? queue.getRange(2,1,queue.getLastRow()-1,JEBG_EMAIL.headers.length).getValues() : [];
  const reference = String(row[0]), email = String(row[2+schema.fields.indexOf('email')] || '').trim().toLowerCase();
  if (!validNotificationRecipient_(email)) throw new Error('Notification recipient is invalid');
  [['acknowledgement',email],['admin',JEBG_CONFIG.contact]].forEach(function(target){
    if (rows.some(function(r){return r[0]===reference && r[2]===target[0];})) return;
    const last=queue.getLastRow();
    if(last>=queue.getMaxRows())queue.insertRowsAfter(queue.getMaxRows(),100);
    queue.getRange(last+1,1,1,JEBG_EMAIL.headers.length).setValues([[reference,kind,target[0],target[1],'Pending',0,'','','']]);
  });
  SpreadsheetApp.flush();
  return true;
}

function validNotificationRecipient_(email) {
  return typeof email==='string' && email.length<=150 && /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email);
}

function storedEmailRecord_(book, kind, reference) {
  const schema=JEBG_SCHEMA[kind];
  if(!schema)throw new Error('Unknown form type');
  const sheet=book.getSheetByName(schema.tab);
  if(!sheet)throw new Error('Missing submission tab');
  assertHeaders_(sheet,schema);
  const rows=sheet.getLastRow()>1 ? sheet.getRange(2,1,sheet.getLastRow()-1,schema.headers.length).getValues() : [];
  const index=rows.findIndex(function(r){return String(r[0])===reference;});
  if(index<0)throw new Error('Saved request not found');
  const row=rows[index], values={};
  schema.fields.forEach(function(field,i){values[field]=String(row[i+2]==null?'':row[i+2]);});
  return {reference:reference,kind:kind,values:values,savedAt:row[1],consent:row[schema.headers.indexOf('Updates Opt-in')]===true,
    sheetUrl:'https://docs.google.com/spreadsheets/d/'+activeSpreadsheetId_()+'/edit#gid='+sheet.getSheetId()+'&range=A'+(index+2)};
}

/** Send under one lock so retries/concurrent form requests cannot send the same queue item. */
function sendQueuedEmails_(reference, limit) {
  const state={acknowledgement:'Not queued',admin:'Not queued'};
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return {acknowledgement:'Pending',admin:'Pending'};
  try {
    const book=SpreadsheetApp.openById(activeSpreadsheetId_()),queue=notificationSheet_(book);
    const count=queue.getLastRow()-1;
    if(count<1)return state;
    const rows=queue.getRange(2,1,count,JEBG_EMAIL.headers.length).getValues();
    const enabled=PropertiesService.getScriptProperties().getProperty(JEBG_EMAIL.flag)==='true';
    let quota=0;
    if(enabled){try{quota=MailApp.getRemainingDailyQuota();}catch(authError){quota=0;}}
    let sent=0;
    for(let i=0;i<rows.length;i++){
      const row=rows[i];
      if(reference && row[0]!==reference)continue;
      if(row[4]==='Sending' && row[6] instanceof Date && Date.now()-row[6].getTime()>600000){
        row[4]='Needs review';row[8]='A send attempt ended without confirmation. Check Sent mail before retrying.';
        queue.getRange(i+2,1,1,JEBG_EMAIL.headers.length).setValues([row]);SpreadsheetApp.flush();
      }
      const requiredRecipients=row[2]==='admin'?2:1;
      if(row[4]==='Pending' && enabled && quota>=requiredRecipients && sent<limit){
        let message;
        try {
          const record=storedEmailRecord_(book,row[1],String(row[0]));
          const expected=row[2]==='admin'?JEBG_CONFIG.contact:record.values.email.trim().toLowerCase();
          if((row[2]!=='admin'&&row[2]!=='acknowledgement')||!validNotificationRecipient_(row[3])||row[3]!==expected)throw new Error('Recipient does not match saved request');
          if(row[2]==='admin'&&!validNotificationRecipient_(JEBG_EMAIL.adminCc))throw new Error('Internal CC recipient is invalid');
          message=submissionEmail_(record,row[2]);
        } catch(buildError){
          row[4]='Needs review';row[8]='Saved record or recipient could not be verified.';
          queue.getRange(i+2,1,1,JEBG_EMAIL.headers.length).setValues([row]);SpreadsheetApp.flush();
        }
        if(message){
          // Persist intent BEFORE calling MailApp. Never automatically resend an uncertain attempt.
          row[4]='Sending';row[5]=Number(row[5]||0)+1;row[6]=new Date();row[8]='';
          queue.getRange(i+2,1,1,JEBG_EMAIL.headers.length).setValues([row]);SpreadsheetApp.flush();
          try {
            MailApp.sendEmail(message);
          } catch(sendError){
            row[4]='Needs review';row[8]='Email send could not be confirmed. Check Sent mail before setting Pending.';
            queue.getRange(i+2,1,1,JEBG_EMAIL.headers.length).setValues([row]);SpreadsheetApp.flush();
            message=null;
          }
          if(message){
            row[4]='Sent';row[7]=new Date();
            // If this write fails, persisted Sending prevents an accidental duplicate.
            queue.getRange(i+2,1,1,JEBG_EMAIL.headers.length).setValues([row]);SpreadsheetApp.flush();
          }
          quota-=requiredRecipients;sent++;
        }
      }
      if(reference && (row[2]==='acknowledgement'||row[2]==='admin'))state[row[2]]=row[4];
    }
    return state;
  } finally { lock.releaseLock(); }
}

function notificationReceiptNote_(details) {
  const status=details && details.email && details.email.acknowledgement;
  if(status==='Sent')return 'An acknowledgement has been sent to your email address. Please check your inbox or spam folder. You may close this tab.';
  if(status==='Pending'||status==='Sending')return 'Your request is saved. Your acknowledgement email is queued. You may close this tab.';
  if(status==='Needs review')return 'Your request is saved. Email delivery could not be confirmed; contact our team using your reference if you need help.';
  if(details && details.duplicate)return 'Your request was already recorded. No new acknowledgement email was generated.';
  return 'Your request is saved. Please keep your reference for follow-up with our team.';
}

function signatureText_() {
  return ['Shekh Aman','Product Development & Deployment Lead','JEBG AI Technologies | IIT Bombay Alumnus','Jamila Exim',
    'jebg.jamilaexim.com','jamilaexim786vector@gmail.com','WhatsApp: +91 84 8709 8639','+91 63510 60318'].join('\n');
}
function signatureHtml_() {
 return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;width:100%;border-top:1px solid #dfe7ed"><tr><td style="padding-top:22px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:4px;background:#14aabc"></td><td style="padding:0 0 0 16px;font-family:Arial,sans-serif"><strong style="font-size:18px;color:#102e41">Shekh Aman</strong><br><span style="font-size:12px;color:#456171;line-height:1.8">Product Development &amp; Deployment Lead<br><strong>JEBG AI Technologies | IIT Bombay Alumnus</strong><br>Jamila Exim</span><br><a href="https://jebg.jamilaexim.com" style="font-size:12px;color:#087d91;text-decoration:none">jebg.jamilaexim.com</a><br><a href="mailto:jamilaexim786vector@gmail.com" style="font-size:12px;color:#087d91;text-decoration:none">jamilaexim786vector@gmail.com</a><br><a href="https://wa.me/918487098639" style="font-size:12px;color:#456171;text-decoration:none">WhatsApp: +91 84 8709 8639</a><br><a href="tel:+916351060318" style="font-size:12px;color:#456171;text-decoration:none">+91 63510 60318</a></td></tr></table></td></tr></table>';
}
function emailText_(value) {return escape_(String(value==null?'':value)).replace(/\r?\n/g,'<br>');}
function submissionEmail_(record, role) {
 const admin=role==='admin',expert=record.kind==='expert',partner=record.kind==='partner',schema=JEBG_SCHEMA[record.kind],v=record.values;
 const label=partner?'Sales partner application':expert?'Developer application':'Customer enquiry';
 const subject=admin?'New '+label.toLowerCase()+' | JEBG | '+record.reference:
   (partner?'Your JEBG sales partner application and commission terms':expert?'Your JEBG developer application is recorded':'Your JEBG enquiry is recorded')+' | '+record.reference;
 const heading=admin?'A new request is ready for review.':partner?'Thank you for your interest in partnering with JEBG.':expert?'Thank you for sharing your expertise.':'Thank you for getting in touch.';
 const intro=admin?'A '+label.toLowerCase()+' has been saved in JEBG MAIN. Review the details below and follow up using the contact information provided.':
   partner?'Your application to become a JEBG Sales Partner has been recorded. Below are the programme terms for your review. This acknowledgement is not an appointment or an approval to represent JEBG.':expert?'Your application to collaborate with JEBG has been recorded. We appreciate your interest in helping build practical industrial and business solutions.':
   'Your enquiry has been recorded. We appreciate the opportunity to understand your requirements and explore how JEBG can help.';
 const next=partner?'Our team will review your industry network and introduction, then contact you about approval and onboarding. Please wait for written approval before promoting yourself as a JEBG Sales Partner or registering leads. You can reply to this email with questions about the terms.':expert?'Our team will review your experience, skills and availability for relevant project opportunities. We may contact you for further discussion. Submitting an application does not guarantee an assignment or employment.':
   'Our team will review your requirements and contact you using the details you provided. You can reply to this email if you would like to add information.';
 const terms=partner?partnerCommissionTerms_():[];
 const termsHtml=partner?'<h2 style="font-size:17px;color:#15384b;margin:27px 0 12px">Sales partner commission terms</h2><ol style="padding-left:20px;color:#516b7b;font-size:13px;line-height:1.8">'+terms.map(function(term){return '<li style="margin-bottom:10px">'+emailText_(term)+'</li>';}).join('')+'</ol>':'';
 const saved=record.savedAt instanceof Date?Utilities.formatDate(record.savedAt,'Asia/Kolkata','dd MMM yyyy, hh:mm a')+' IST':'Recorded';
 const details=schema.fields.map(function(key,i){return '<tr><td style="padding:11px 13px;border-bottom:1px solid #e3eaf0;vertical-align:top;width:34%;font-size:12px;color:#607786">'+emailText_(schema.labels[i])+'</td><td style="padding:11px 13px;border-bottom:1px solid #e3eaf0;vertical-align:top;font-size:13px;color:#183445;word-break:break-word">'+emailText_(v[key]||'Not provided')+'</td></tr>';}).join('');
 const consent='Optional updates: '+(record.consent?'Opted in':'Not opted in');
 const buttonUrl=admin?record.sheetUrl:JEBG_CONFIG.website;
 const buttonLabel=admin?'Review saved record':'Explore JEBG solutions';
 const greeting=admin?'Hello JEBG Team,':'Hello '+(v.name||'there')+',';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media(max-width:600px){.pad{padding:26px 22px!important}.outer{padding:16px 8px!important}.title{font-size:27px!important}}</style></head><body style="margin:0;padding:0;background:#edf3f7;color:#183445;font-family:Arial,sans-serif"><div style="display:none;font-size:1px;line-height:1px;color:#edf3f7;max-height:0;max-width:0;opacity:0;overflow:hidden">'+emailText_(label+' recorded. Reference: '+record.reference)+'</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf3f7"><tr><td class="outer" align="center" style="padding:32px 16px"><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #dce6ed;border-radius:12px;overflow:hidden"><tr><td class="pad" style="padding:30px 36px;background:#0b2232;border-bottom:4px solid #35c5d6"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border:1px solid #4ad9eb;padding:7px 11px;font-size:15px;color:#4ad9eb;font-weight:bold;letter-spacing:3px">JEBG</td><td style="padding-left:14px;color:#edf7fc;font-size:12px;letter-spacing:1.4px;font-weight:bold">AI TECHNOLOGIES<br><span style="color:#a2bdce;font-size:9px;letter-spacing:1px;font-weight:normal">INDUSTRIAL &amp; BUSINESS SOLUTIONS</span></td></tr></table></td></tr><tr><td class="pad" style="padding:36px"><p style="margin:0 0 12px;font-size:10px;letter-spacing:1.8px;color:#07869a;font-weight:bold">'+(admin?'NEW SUBMISSION':'REQUEST RECORDED')+'</p><h1 class="title" style="margin:0 0 22px;font-size:32px;line-height:1.2;letter-spacing:-.8px;color:#102e41">'+heading+'</h1><p style="font-size:14px;line-height:1.8;margin:0 0 12px">'+emailText_(greeting)+'</p><p style="font-size:14px;line-height:1.8;color:#516b7b;margin:0 0 24px">'+intro+'</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf8f9;border:1px solid #bfe5e9;border-radius:7px"><tr><td style="padding:20px"><p style="margin:0 0 7px;font-size:10px;letter-spacing:1.5px;color:#4b7680;font-weight:bold">YOUR REFERENCE NUMBER</p><p style="margin:0 0 7px;font:14px/1.6 monospace;word-break:break-all;color:#0b5364">'+emailText_(record.reference)+'</p><p style="margin:0;font-size:11px;color:#51747e">'+emailText_(label+' · '+saved)+'</p></td></tr></table><h2 style="font-size:17px;color:#15384b;margin:27px 0 12px">'+(admin?'Submission details':'A copy of your request')+'</h2><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e3eaf0">'+details+'</table>'+termsHtml+'<p style="font-size:11px;color:#6b8291;margin:12px 0 24px">'+emailText_(consent)+'</p><h2 style="font-size:17px;color:#15384b;margin:0 0 10px">'+(admin?'Next action':'What happens next')+'</h2><p style="font-size:13px;line-height:1.8;color:#516b7b;margin:0 0 24px">'+(admin?'Open the saved record, review the request, and update its Status and Notes as appropriate. Reply to this email to contact the submitter.':next)+'</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#087f94" style="border-radius:5px"><a href="'+escape_(buttonUrl)+'" style="display:inline-block;padding:13px 21px;font-size:12px;font-weight:bold;color:#ffffff;text-decoration:none">'+buttonLabel+' &rarr;</a></td></tr></table>'+signatureHtml_()+'</td></tr><tr><td class="pad" style="padding:20px 36px;background:#f6f9fb;border-top:1px solid #e3eaf0;font-size:10px;line-height:1.8;color:#78909e">'+(admin?'Internal JEBG notification. Submission details are provided for review and response.':'This is a service acknowledgement for the request you submitted to JEBG. Optional promotional updates are managed separately.')+'<br>&copy; 2026 JEBG / Jamila Exim</td></tr></table></td></tr></table></body></html>';
 const body=[greeting,'',heading,'',intro,'','Reference: '+record.reference,label+' | '+saved,'',...schema.fields.map(function(key,i){return schema.labels[i]+': '+(v[key]||'Not provided');}),'',...terms,'',consent,'',admin?'Review the saved record: '+record.sheetUrl:next,'',JEBG_CONFIG.website,'',signatureText_()].join('\n');
 return {to:admin?JEBG_CONFIG.contact:v.email.trim().toLowerCase(),...(admin?{cc:JEBG_EMAIL.adminCc}:{}),replyTo:admin?v.email.trim().toLowerCase():JEBG_CONFIG.contact,subject:subject,body:body,htmlBody:html,name:JEBG_EMAIL.senderName};
}

/** Rebuild only missing queue items for email-era records, never for historical records. */
function reconcileSubmissionEmails_() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try {
    const book=SpreadsheetApp.openById(activeSpreadsheetId_());
    Object.keys(JEBG_SCHEMA).forEach(function(kind){
      const schema=JEBG_SCHEMA[kind],sheet=book.getSheetByName(schema.tab);
      if(!sheet)return;
      assertHeaders_(sheet,schema);
      if(sheet.getLastRow()<2)return;
      const rows=sheet.getRange(2,1,sheet.getLastRow()-1,schema.headers.length).getValues();
      rows.forEach(function(row){ try { queueSubmissionEmails_(book,schema,kind,row); } catch(queueError) {} });
    });
  } finally {lock.releaseLock();}
}

function partnerCommissionTerms_() { return [
  "Commission: 20% of the approved sale value excluding taxes. Commission is calculated on the final sale value after discounts, and is earned only on customer payments actually received by JEBG.",
  "Example: If the sale value is INR 100 + taxes, your commission is 20% of INR 100 = INR 20. The tax amount is excluded from the commission calculation.",
  "Eligibility: Your partner application and each referred lead must be accepted by JEBG in writing before sales work begins. Existing customers, existing opportunities, duplicate referrals and self-referrals are not automatically eligible; any exception needs written confirmation.",
  "Payment: Commission is payable after JEBG receives and verifies the corresponding customer payment. For instalments, commission accrues proportionately on the pre-tax amount received. Payout timing and payment details will be confirmed during onboarding before you start.",
  "Cancellations and refunds: No commission is earned on unpaid, cancelled or refunded amounts. Any commission already paid on a subsequently refunded amount is adjusted against future payouts or returned as agreed.",
  "Role: JEBG handles technical proposals, pricing, contracts and delivery. Partners must not promise discounts, make commitments, collect customer money or sign on behalf of JEBG without written authorization.",
  "Conduct: Share accurate, approved product information and introduce contacts with permission. Do not use spam, misleading claims or unauthorized use of the JEBG brand.",
  "Scope: This is a commission-based collaboration with no salary, guaranteed income or employment commitment. Renewal sales and additional projects require separate written confirmation of referral eligibility.",
  "Next steps: Reply with questions. Final onboarding and lead-registration arrangements will be confirmed in writing before collaboration begins. Terms version: 2026-11-08-v1."
]; }
