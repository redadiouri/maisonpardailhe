// Lightweight custom datepicker for Click & Collect (no external deps)
(function(){
  function pad(n){ return String(n).padStart(2,'0'); }
  function iso(date){ return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
  function parseISO(s){ if(!s) return null; const [y,m,d]=String(s).split('-').map(Number); return new Date(y,m-1,d); }
  // Verbose French display e.g. "Lundi 1 Nov 2025"
  const FRENCH_WEEKDAYS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const FRENCH_MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  function formatVerboseFromISO(s){ if(!s) return ''; const [y,m,d]=String(s).split('-').map(Number); const dt = new Date(y,m-1,d); const dayName = FRENCH_WEEKDAYS[dt.getDay()] || ''; const monthName = FRENCH_MONTHS_SHORT[(m-1)||0]; return `${dayName} ${d} ${monthName} ${y}`; }
  // Keep a simple numeric fallback (DD/MM/YYYY) if needed
  function formatDisplayFromISO(s){ return formatVerboseFromISO(s); }

  function todayIso(){ const d=new Date(); return iso(d); }

  function createCalendar(container, year, month, opts){
    container.innerHTML = '';
    const header = document.createElement('div'); header.className='mp-header';
    const prev = document.createElement('button'); prev.className='mp-nav'; prev.textContent='←';
    const next = document.createElement('button'); next.className='mp-nav'; next.textContent='→';
    const title = document.createElement('div'); title.className='mp-title'; title.textContent = `${month+1}/${year}`;
    header.appendChild(prev); header.appendChild(title); header.appendChild(next);
    container.appendChild(header);

    const grid = document.createElement('div'); grid.className='mp-grid';
    // weekdays
    ['L','M','M','J','V','S','D'].forEach(w=>{ const el=document.createElement('div'); el.className='mp-weekday'; el.textContent=w; grid.appendChild(el); });

    const first = new Date(year, month, 1);
    const startDay = (first.getDay()+6)%7; // make Monday=0
    const daysInMonth = new Date(year, month+1, 0).getDate();

    // fill blanks
    for(let i=0;i<startDay;i++){ const e=document.createElement('div'); grid.appendChild(e); }

    for(let d=1; d<=daysInMonth; d++){
      const day = document.createElement('button'); day.className='mp-day'; day.type='button'; day.textContent = String(d);
      const dt = new Date(year, month, d);
      const isoStr = iso(dt);
      // apply min/max
      if (opts.min && isoStr < opts.min) { day.classList.add('disabled'); day.disabled=true; }
      if (opts.max && isoStr > opts.max) { day.classList.add('disabled'); day.disabled=true; }
      if (opts.value && isoStr === opts.value) { day.classList.add('selected'); }
      day.addEventListener('click', function(){ if (day.disabled) return; opts.onSelect(isoStr); });
      grid.appendChild(day);
    }

    container.appendChild(grid);

    prev.addEventListener('click', ()=>{ const m = month-1<0 ? 11 : month-1; const y = month-1<0 ? year-1 : year; createCalendar(container, y, m, opts); });
    next.addEventListener('click', ()=>{ const m = month+1>11 ? 0 : month+1; const y = month+1>11 ? year+1 : year; createCalendar(container, y, m, opts); });
  }

  function positionPopup(popup, input){
    const r = input.getBoundingClientRect();
    const docEl = document.documentElement;
    const top = r.bottom + window.scrollY + 6;
    let left = r.left + window.scrollX;
    // keep within viewport
    const maxRight = window.innerWidth - 20;
    if (left + popup.offsetWidth > maxRight) left = Math.max(10, maxRight - popup.offsetWidth);
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
  }

  function attachPicker(display, hidden){
    if (!display) return;
    // find linked hidden ISO input
    if (!hidden){
      const targetId = display.dataset.datepickerTarget;
      if (targetId) hidden = document.getElementById(targetId);
    }
    // if still no hidden, create one (not recommended) and append after display
    if (!hidden){
      hidden = document.createElement('input'); hidden.type = 'hidden';
      const hidId = display.id ? `${display.id}-iso` : `dp-iso-${Math.random().toString(36).slice(2,8)}`;
      hidden.id = hidId; display.insertAdjacentElement('afterend', hidden);
    }

    // ensure hidden has ISO default
    if (!hidden.value) hidden.value = todayIso();
    // set display to formatted value
    display.value = formatDisplayFromISO(hidden.value);

    let popup = null;

    const open = ()=>{
      if (popup) return;
      popup = document.createElement('div'); popup.className='mp-datepicker';
      popup.tabIndex = -1;
      document.body.appendChild(popup);
      // show month of current hidden value if present
      const cur = parseISO(hidden.value) || new Date();
      const curYear = cur.getFullYear(); const curMonth = cur.getMonth();
      const min = todayIso(); const maxDate = new Date(); maxDate.setDate(maxDate.getDate()+30); const max = iso(maxDate);
      const opts = { min, max, value: hidden.value, onSelect: (isoStr)=>{
          hidden.value = isoStr;
          display.value = formatDisplayFromISO(isoStr);
          close();
          // notify any listeners
          hidden.dispatchEvent(new Event('input',{bubbles:true}));
          display.dispatchEvent(new Event('input',{bubbles:true}));
      }};
      createCalendar(popup, curYear, curMonth, opts);
      positionPopup(popup, display);
      setTimeout(()=> popup.classList.add('visible'), 10);

      // close on outside click
      const onDocClick = (ev)=>{ if (!popup) return; if (ev.target===display) return; if (!popup.contains(ev.target)) close(); };
      const onKey = (ev)=>{ if (ev.key==='Escape') close(); };
      document.addEventListener('click', onDocClick); document.addEventListener('keydown', onKey);
      popup._cleanup = ()=>{ document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey); };
    };

    const close = ()=>{ if (!popup) return; popup._cleanup && popup._cleanup(); popup.remove(); popup=null; };

    display.addEventListener('focus', open);
    display.addEventListener('click', open);
    // close when navigating away
    display.addEventListener('blur', ()=>{ setTimeout(()=>{ if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.mp-datepicker')) return; close(); }, 150); });
  }

  function init(){
    const els = document.querySelectorAll('[data-datepicker]');
    els.forEach((display)=>{
      const targetId = display.dataset.datepickerTarget;
      const hidden = targetId ? document.getElementById(targetId) : null;
      attachPicker(display, hidden);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
