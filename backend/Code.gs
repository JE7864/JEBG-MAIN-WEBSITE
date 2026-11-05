/** JEBG Website Google Sheets backend, v1.1.0.
 * Bound to the private JEBG website spreadsheet. No read/list/admin HTTP endpoint.
 * Deploy as a Web app, Execute as Me, access Anyone. Keep the sheet Restricted.
 * No email sending is enabled in this release.
 */
const JEBG_CONFIG = Object.freeze({
  spreadsheetId: '1DtPBIHmnrbot9dieZlj5UbWtYD1uFCL9dGUP-yNWef0',
  website: 'https://jebg.jamilaexim.com',
  contact: 'jamilaexim786vector@gmail.com',
  maxDailySubmissions: 500,
  maxPerEmailPerHour: 10,
  version: '1.1.0'
});
const JEBG_CONSENT = {
  customer: 'I would like to receive relevant JEBG product updates and promotional communications by email. I can withdraw this preference at any time.',
  expert: 'I would like to receive relevant JEBG project opportunities and Expert Network updates by email. I can withdraw this preference at any time.'
};
const JEBG_SCHEMA = {
  "customer": {
    "tab": "Customer Enquiries",
    "fields": [
      "name",
      "company",
      "email",
      "phone",
      "product",
      "industry",
      "systems",
      "timeline",
      "budget",
      "message"
    ],
    "labels": [
      "Name",
      "Company",
      "Email",
      "Phone",
      "Product or Service",
      "Industry",
      "Existing Systems",
      "Preferred Timeline",
      "Indicative Budget",
      "Requirement"
    ],
    "headers": [
      "Reference",
      "Submitted At UTC",
      "Name",
      "Company",
      "Email",
      "Phone",
      "Product or Service",
      "Industry",
      "Existing Systems",
      "Preferred Timeline",
      "Indicative Budget",
      "Requirement",
      "Updates Opt-in",
      "Consent Text",
      "Consent Version",
      "Consent At UTC",
      "Status",
      "Notes",
      "Updated At UTC",
      "Source",
      "Request ID",
      "Dedupe Hash"
    ]
  },
  "expert": {
    "tab": "Developer Applications",
    "fields": [
      "name",
      "email",
      "location",
      "specialisation",
      "experience",
      "portfolio",
      "availability",
      "engagement",
      "message"
    ],
    "labels": [
      "Name",
      "Email",
      "Location",
      "Specialisation",
      "Experience",
      "Portfolio",
      "Availability",
      "Engagement",
      "Skills and Relevant Work"
    ],
    "headers": [
      "Reference",
      "Submitted At UTC",
      "Name",
      "Email",
      "Location",
      "Specialisation",
      "Experience",
      "Portfolio",
      "Availability",
      "Engagement",
      "Skills and Relevant Work",
      "Updates Opt-in",
      "Consent Text",
      "Consent Version",
      "Consent At UTC",
      "Status",
      "Notes",
      "Updated At UTC",
      "Source",
      "Request ID",
      "Dedupe Hash"
    ]
  }
};

/** Run once in the Apps Script editor. This preserves all existing rows. */
function setupJebgBackend() {
  const book = SpreadsheetApp.openById(JEBG_CONFIG.spreadsheetId);
  book.setSpreadsheetTimeZone('Etc/UTC');
  Object.keys(JEBG_SCHEMA).forEach(function (kind) {
    const schema = JEBG_SCHEMA[kind], sheet = book.getSheetByName(schema.tab);
    if (!sheet) throw new Error('Missing tab: ' + schema.tab);
    assertHeaders_(sheet, schema);
    sheet.setFrozenRows(1); sheet.setFrozenColumns(1);
    sheet.getRange(1, 1, 1, schema.headers.length).setBackground('#eeeeee').setFontWeight('bold').setWrap(true);
    sheet.setRowHeight(1, 36);
    if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), schema.headers.length).createFilter();
    const statusCol = schema.headers.indexOf('Status') + 1;
    sheet.getRange(2, statusCol, sheet.getMaxRows() - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['New', 'Contacted', 'Discussion', 'Proposal', 'Closed', 'Do not contact'], true).setAllowInvalid(false).build());
  });
  return 'JEBG backend ready. Deploy the Web app and test both forms before cutover.';
}

function doGet() {
  return receipt_(false, 'This address receives JEBG website submissions. Please use the enquiry or developer form on our website.', '');
}

function doPost(e) {
  try {
    if (!e || !e.parameter || typeof e.parameter.payload !== 'string') fail_('No submission was received. Please return to the website and try again.');
    if (e.parameter.payload.length > 20000) fail_('Your submission is too long. Please shorten it and try again.');
    let data; try { data = JSON.parse(e.parameter.payload) } catch (err) { fail_('The submission format is invalid. Please return to the website and retry.'); }
    const result = saveSubmission_(data);
    return receipt_(true, result.duplicate ? 'This submission was already saved.' : 'Thank you. Your ' + (data.kind === 'expert' ? 'application' : 'enquiry') + ' has been saved.', result.id, { kind: data.kind, duplicate: result.duplicate, savedAt: result.savedAt });
  } catch (err) {
    const message = err && err.publicMessage ? err.publicMessage : 'We could not confirm a save. Please retry from the website using the same submission, or contact ' + JEBG_CONFIG.contact + '.';
    // No form contents, email addresses or internal error details are logged or returned.
    return receipt_(false, message, '');
  }
}

function saveSubmission_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail_('Invalid submission.');
  if (input.website) fail_('Unable to accept this submission.');
  if (input.kind !== 'customer' && input.kind !== 'expert') fail_('Invalid form type.');
  const schema = JEBG_SCHEMA[input.kind];
  if (input.agreement !== true) fail_('Please confirm permission to store and respond to your submission.');
  if (typeof input.consent !== 'boolean') fail_('Invalid communication preference.');
  if (typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId)) fail_('Invalid submission reference. Refresh the website and retry.');
  const values = {}; schema.fields.forEach(function (key) {
    if (input[key] != null && typeof input[key] !== 'string') fail_('Invalid field: ' + key);
    values[key] = String(input[key] || '').trim();
    if (values[key].length > (key === 'message' ? 2500 : key === 'portfolio' ? 500 : 250)) fail_('Field too long: ' + key);
  });
  values.email = values.email.toLowerCase();
  const required = input.kind === 'customer' ? ['name', 'company', 'email', 'product', 'message'] : ['name', 'email', 'location', 'specialisation', 'experience', 'availability', 'engagement', 'message'];
  if (required.some(function (k) { return !values[k] })) fail_('Complete all required fields before submitting.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fail_('Enter a valid email address.');
  if (values.portfolio && !/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(values.portfolio)) fail_('Portfolio must be a valid http or https link.');
  const dedupe = sha256_(input.kind + '|' + JSON.stringify(values) + '|' + (input.consent ? 1 : 0));
  const lock = LockService.getScriptLock(); if (!lock.tryLock(15000)) fail_('The form is busy. Please try again shortly.');
  try {
    const book = SpreadsheetApp.openById(JEBG_CONFIG.spreadsheetId), sheet = book.getSheetByName(schema.tab);
    if (!sheet) throw new Error('Missing storage tab'); assertHeaders_(sheet, schema);
    const last = sheet.getLastRow(), width = schema.headers.length;
    const requestCol = schema.headers.indexOf('Request ID'), hashCol = schema.headers.indexOf('Dedupe Hash');
    if (last > 1) {
      const rows = sheet.getRange(2, 1, last - 1, width).getValues();
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][requestCol] === input.requestId && rows[i][hashCol] !== dedupe) fail_('This reference was already used for different details. Return to the website, edit your details and submit again.');
        if (rows[i][requestCol] === input.requestId || rows[i][hashCol] === dedupe) return { id: String(rows[i][0]), duplicate: true, savedAt: rows[i][1] };
      }
    }
    const now = new Date(), day = Utilities.formatDate(now, 'Etc/UTC', 'yyyy-MM-dd');
    const props = PropertiesService.getScriptProperties(), stored = JSON.parse(props.getProperty('JEBG_DAILY_COUNTER') || '{}');
    const daily = stored.day === day ? Number(stored.count || 0) : 0;
    if (daily >= JEBG_CONFIG.maxDailySubmissions) fail_('Online submissions have reached today’s limit. Please contact us by email.');
    const cache = CacheService.getScriptCache(), hour = Utilities.formatDate(now, 'Etc/UTC', 'yyyyMMddHH');
    const rateKey = 'rate:' + sha256_(values.email) + '|' + hour, count = Number(cache.get(rateKey) || 0);
    if (count >= JEBG_CONFIG.maxPerEmailPerHour) fail_('Too many submissions for this email. Please try again later.');
    const id = Utilities.getUuid();
    const row = [id, now].concat(schema.fields.map(function (k) { return literal_(values[k]) })).concat([input.consent, JEBG_CONSENT[input.kind], '2026-11-04-v1', now, 'New', '', now, 'Google website form', input.requestId, dedupe]);
    if (last >= sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    sheet.getRange(last + 1, 1, 1, width).setValues([row]); SpreadsheetApp.flush();
    const verified = sheet.getRange(last + 1, 1, 1, width).getValues()[0];
    if (String(verified[0]) !== id || verified[requestCol] !== input.requestId || verified[hashCol] !== dedupe) {
      throw new Error('Storage readback failed');
    }
    // Counters are supplementary abuse controls. A saved row must still receive a receipt if they fail.
    try { props.setProperty('JEBG_DAILY_COUNTER', JSON.stringify({ day: day, count: daily + 1 })); cache.put(rateKey, String(count + 1), 3600) } catch (counterError) { }
    return { id: id, duplicate: false, savedAt: now };
  } finally { lock.releaseLock(); }
}

function assertHeaders_(sheet, schema) {
  const actual = sheet.getRange(1, 1, 1, schema.headers.length).getDisplayValues()[0];
  if (actual.some(function (value, index) { return value !== schema.headers[index] })) throw new Error('Storage headers changed');
}
function literal_(value) { return /^[\s]*[=+@-]/.test(value) ? "'" + value : value; }
function sha256_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2) }).join(''); }
function fail_(message) { const error = new Error(message); error.publicMessage = message; throw error; }
function escape_(text) { return String(text).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }); }
function receipt_(saved, message, id, details) {
  details = details || {};
  const type = details.kind === 'expert' ? 'Developer application' : 'Customer enquiry';
  const title = saved ? (details.duplicate ? 'Already safely received.' : 'Thank you. You’re all set.') : 'Let’s complete your submission.';
  const timestamp = saved && details.savedAt instanceof Date && !isNaN(details.savedAt.getTime())
    ? Utilities.formatDate(details.savedAt, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a') + ' IST' : '';
  const icon = saved ? '&#10003;' : '!';
  const record = saved ? '<section class="record" aria-label="Submission receipt"><div class="record-top"><span>' + escape_(type) + '</span><span class="badge">' + (details.duplicate ? 'Previously saved' : 'Saved successfully') + '</span></div><p class="label">YOUR REFERENCE NUMBER</p><p class="reference">' + escape_(id) + '</p>' + (timestamp ? '<p class="timestamp">Recorded ' + escape_(timestamp) + '</p>' : '') + '<p class="hint">Keep this reference for any follow-up with our team.</p></section>' : '<section class="record"><p class="label">YOUR NEXT STEP</p><p>Return to your original form, review your details and try again. Your entries remain in that tab.</p><p class="hint">A save is confirmed only when a reference number is displayed.</p></section>';
  const journey = saved ? '<section class="journey" aria-label="What happens next"><h2>What happens next</h2><ol><li class="done"><span>01</span><div><strong>Submission received</strong><p>Your details reached JEBG.</p></div></li><li class="done"><span>02</span><div><strong>Record saved</strong><p>' + (details.duplicate ? 'Your existing record is retained. No duplicate was added.' : 'Your details are stored in our private records.') + '</p></div></li><li><span>03</span><div><strong>Team review</strong><p>' + (details.kind === 'expert' ? 'We’ll review your expertise for relevant project opportunities.' : 'We’ll review your requirement and contact you using the details provided.') + '</p></div></li></ol></section>' : '';
  const html = `<!doctype html><html lang="en"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JEBG | Submission receipt</title><style>
*{box-sizing:border-box}body{margin:0;background:#07131e;color:#eaf4fc;font:15px/1.65 Arial,sans-serif;min-height:100vh;background-image:radial-gradient(ellipse at 75% 0,#123c53 0,transparent 60%)}a{color:inherit}header,main,footer{width:calc(100% - 40px);max-width:860px;margin:auto}header{display:flex;align-items:center;gap:14px;padding:30px 0}.mark{border:1px solid #4ad9eb;border-radius:5px;padding:7px 12px;font-weight:800;letter-spacing:3px;color:#4ad9eb}.brand{font-size:12px;font-weight:bold;letter-spacing:1.7px}.brand small{display:block;font-size:9px;letter-spacing:1.2px;color:#9db4c5;margin-top:3px}.card{background:#0b1e2c;border:1px solid #294858;border-radius:18px;overflow:hidden;box-shadow:0 24px 80px #0003}.intro{padding:38px 42px 26px}.icon{display:flex;width:54px;height:54px;align-items:center;justify-content:center;border:1px solid ${saved ? '#3d907a' : '#b39456'};border-radius:50%;background:${saved ? '#143c37' : '#3a3020'};color:${saved ? '#8ae0bd' : '#f5d28c'};font-size:27px;margin-bottom:23px}.eyebrow{color:#4ad9eb;font-size:10px;letter-spacing:2px;font-weight:bold;text-transform:uppercase}h1{font-size:clamp(28px,5vw,40px);line-height:1.15;letter-spacing:-1.2px;margin:13px 0 16px}p{margin:0 0 12px}.intro>p{color:#b0c5d4;max-width:620px}.record{margin:0 42px;padding:24px;background:#071925;border:1px solid #315365;border-radius:10px}.record-top{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;font-weight:bold;margin-bottom:22px}.badge{font-size:10px;color:#8ae0bd;background:#13382f;border:1px solid #2c5d4d;padding:4px 10px;border-radius:20px;white-space:nowrap}.label{color:#91b2c7;font-size:9px;letter-spacing:1.7px;font-weight:bold;margin-bottom:9px}.reference{font:500 clamp(13px,2.5vw,20px)/1.6 monospace;color:#d8f8fc;overflow-wrap:anywhere;letter-spacing:.3px}.timestamp,.hint{font-size:11px;color:#94afc1}.hint{margin-bottom:0}.journey{padding:28px 42px}h2{font-size:17px;margin:0 0 20px}ol{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px}li{display:flex;gap:10px}li>span{font-size:10px;width:26px;height:26px;flex:0 0 26px;display:grid;place-items:center;border:1px solid #526475;border-radius:50%;color:#aac1d1}.done>span{border-color:#3a7c69;background:#15352f;color:#8ae0bd}li strong{font-size:12px}li p{font-size:11px;color:#9db4c5;margin-top:6px}.actions{padding:25px 42px 30px;border-top:1px solid #233f51;display:flex;gap:12px;align-items:center;flex-wrap:wrap}.button{display:inline-block;text-decoration:none;padding:12px 19px;background:#4ad9eb;color:#05202c;border-radius:5px;font-size:12px;font-weight:bold}.secondary{border:1px solid #35556b;background:transparent;color:#d9eaf5}.note{width:100%;font-size:10px;color:#91acbe;margin:3px 0 0}footer{display:flex;justify-content:space-between;gap:20px;padding:23px 0 32px;color:#829eb2;font-size:10px}a:focus-visible{outline:2px solid #4ad9eb;outline-offset:5px}@media(max-width:600px){header{padding:23px 0}.intro{padding:28px 23px 20px}.record{margin:0 23px;padding:20px}.record-top{align-items:flex-start;flex-direction:column;gap:9px}.journey{padding:26px 23px}ol{grid-template-columns:1fr;gap:15px}.actions{padding:23px}footer{flex-direction:column;gap:5px}.button{width:100%;text-align:center}}
</style></head><body><header><span class="mark">JEBG</span><div class="brand">AI TECHNOLOGIES<small>INDUSTRIAL &amp; BUSINESS SOLUTIONS</small></div></header><main><article class="card"><div class="intro"><div class="icon" aria-hidden="true">${icon}</div><div class="eyebrow">${saved ? 'Submission confirmed' : 'Action needed'}</div><h1>${title}</h1><p>${escape_(message)}</p></div>${record}${journey}<div class="actions"><a class="button" href="${JEBG_CONFIG.website}">Return to JEBG website &rarr;</a><a class="button secondary" href="mailto:${JEBG_CONFIG.contact}">Contact our team</a><p class="note">${saved ? 'No automatic email has been sent. You may close this tab and return to your original form.' : 'If you need help, contact our team. No confirmation email has been sent.'}</p></div></article></main><footer><span>&copy; 2026 JEBG / Jamila Exim</span><span>Submission service &middot; v${JEBG_CONFIG.version}</span></footer></body></html>`;
  return HtmlService.createHtmlOutput(html).setTitle('JEBG | ' + (saved ? 'Submission confirmed' : 'Submission information'));
}
