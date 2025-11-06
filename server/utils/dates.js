const TZ = process.env.TIMEZONE || 'Europe/Paris';

function pad(n){ return String(n).padStart(2,'0'); }

function normalizeToYMD(input){
  if (!input) return null;
  const s = String(input).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (fr) {
    const day = pad(Number(fr[1]));
    const month = pad(Number(fr[2]));
    const year = String(fr[3]);
    return `${year}-${month}-${day}`;
  }
    try {
    const dt = new Date(s);
    if (isNaN(dt)) return null;
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(dt);
    const y = parts.find(p=>p.type==='year').value;
    const m = parts.find(p=>p.type==='month').value;
    const d = parts.find(p=>p.type==='day').value;
    return `${y}-${m}-${d}`;
  } catch (e) {
    return null;
  }
}

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
