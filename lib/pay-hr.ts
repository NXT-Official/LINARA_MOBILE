/**
 * Staff pay & HR (payslip, pay confirmations, where to send pay, vale,
 * SSS / PhilHealth / Pag-IBIG) is switched off for now while it's brought in
 * line with the law. Records are kept; My Record still shows her own history.
 * Rest owed, rest-off and leave stay on. The database refuses the pay writes
 * this app makes directly (../LINARA/supabase/add-pay-hr-switch.sql). Same
 * switch as ../LINARA/src/lib/pay-hr.ts; flip both (and the SQL switch) to
 * turn it back on.
 */
export const PAY_HR_ENABLED = false;
