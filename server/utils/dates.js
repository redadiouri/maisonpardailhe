// Utilities to parse, normalize and format dates consistently using a configured timezone
const TZ = process.env.TIMEZONE || 'Europe/Paris';

function pad(n){ return String(n).padStart(2,'0'); }

// Normalize various input date forms to YYYY-MM-DD in the configured timezone.
// Accepts:
// - YYYY-MM-DD
// - DD/MM/YYYY
// - ISO timestamps (with time and timezone)
function normalizeToYMD(input){
  if (!input) return null;
  const s = String(input).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (fr) {
    const day = pad(Number(fr[1]));
    const month = pad(Number(fr[2]));
    const year = String(fr[3]);
    return `${year}-${month}-${day}`;
  }
  // Try ISO parse and format in TZ
  try {
    const dt = new Date(s);
    if (isNaN(dt)) return null;
    // use Intl to get date parts in target TZ
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(dt);
    const y = parts.find(p=>p.type==='year').value;
    const m = parts.find(p=>p.type==='month').value;
    const d = parts.find(p=>p.type==='day').value;
    return `${y}-${m}-${d}`;
  } catch (e) {
    return null;
  }
}

// Format a date input (ISO/yyy-mm-dd/Date) into a human-friendly string in TZ.
// If includeTime is true and the input contains time, include "à HH:MM".
function formatForDisplay(input, includeTime = false){
  if (!input) return '';
  try {
    const dt = (input instanceof Date) ? input : new Date(input);
    if (isNaN(dt)) return String(input);
    const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
    const dateStr = dateFmt.format(dt);
    if (!includeTime) return dateStr;
    const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
    const timeStr = timeFmt.format(dt);
    return `${dateStr} à ${timeStr}`;
  } catch (e) {
    return String(input);
  }
}

module.exports = { normalizeToYMD, formatForDisplay, TZ };
