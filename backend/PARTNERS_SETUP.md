# Sales partner applications

Partner applications use the existing public submission endpoint, active backend spreadsheet and transactional email queue. Prepare the Partner Applications tab with the exact JEBG_SCHEMA.partner headers before deployment. No existing rows or headers are changed.

The compact website section uses one partner category. The acknowledgement and owner notification include 20% commission on the final pre-tax sale value actually received, INR 100 + taxes -> INR 20 commission, lead and partner approval, instalments, refunds, role limits and onboarding next steps. Terms version 2026-11-08-v1 and commission rate are fixed server-side and stored with each application. Submission is an application, not a partner appointment or legal acceptance of a contract.

Public and private Apps Script deployments keep their existing URLs and execution/access settings. Preserve script properties and retry triggers; do not rerun email activation. The private dashboard includes a Sales partners view. Only the new partner tab is added to the existing spreadsheet; customer/developer submissions and metrics are retained.
