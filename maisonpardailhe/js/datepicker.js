// Lightweight custom datepicker for Click & Collect (no external deps)
(function(){
  function pad(n){ return String(n).padStart(2,'0'); }
  function iso(date){ return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
  function parseISO(s){ if(!s) return null; const [y,m,d]=String(s).split('-').map(Number); return new Date(y,m-1,d); }
  // Verbose French display e.g. "Lundi 1 Nov 2025"
  const FRENCH_WEEKDAYS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const FRENCH_MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  function formatVerboseFromISO(s){ if(!s) return ''; const [y,m,d]=String(s).split('-').map(Number); const dt = new Date(y,m-1,d); const dayName = FRENCH_WEEKDAYS[dt.getDay()] || ''; const monthName = FRENCH_MONTHS_SHORT[(m-1)||0]; return `${dayName} ${d} ${monthName} ${y}`; }
  function formatDisplayFromISO(s){ return formatVerboseFromISO(s); }
  function todayIso(){ const d=new Date(); return iso(d); }

  function createCalendar(container, year, month, opts){
    container.innerHTML = '';
    const header = document.createElement('div'); header.className='mp-header';
    const prev = document.createElement('button'); prev.className='mp-nav'; prev.type='button'; prev.setAttribute('aria-label','Mois précédent'); prev.textContent='←';
    const next = document.createElement('button'); next.className='mp-nav'; next.type='button'; next.setAttribute('aria-label','Mois suivant'); next.textContent='→';
    const titleBtn = document.createElement('button'); titleBtn.className='mp-title'; titleBtn.type='button'; titleBtn.textContent = `${FRENCH_MONTHS_SHORT[month]} ${year}`;
    const chooser = document.createElement('div'); chooser.className = 'mp-chooser'; chooser.style.display = 'none';
    const monthSelect = document.createElement('select');
    FRENCH_MONTHS_SHORT.forEach((mname, idx)=>{ const o=document.createElement('option'); o.value=String(idx); o.textContent=mname; if (idx===month) o.selected=true; monthSelect.appendChild(o); });
    const yearSelect = document.createElement('select');
    for(let y = year-1; y<= year+1; y++){ const o=document.createElement('option'); o.value=String(y); o.textContent=String(y); if (y===year) o.selected=true; yearSelect.appendChild(o); }
    const goBtn = document.createElement('button'); goBtn.type='button'; goBtn.textContent='Aller'; goBtn.className='mp-go';
    chooser.appendChild(monthSelect); chooser.appendChild(yearSelect); chooser.appendChild(goBtn);
    header.appendChild(prev); header.appendChild(titleBtn); header.appendChild(next); header.appendChild(chooser);
    container.appendChild(header);

    const grid = document.createElement('div'); grid.className='mp-grid';
    ['L','M','M','J','V','S','D'].forEach(w=>{ const el=document.createElement('div'); el.className='mp-weekday'; el.textContent=w; grid.appendChild(el); });

    const first = new Date(year, month, 1);
    const startDay = (first.getDay()+6)%7; // Monday=0
    const daysInMonth = new Date(year, month+1, 0).getDate();

    for(let i=0;i<startDay;i++){ const e=document.createElement('div'); grid.appendChild(e); }

    for(let d=1; d<=daysInMonth; d++){
      const day = document.createElement('button'); day.className='mp-day'; day.type='button'; day.textContent = String(d);
      const dt = new Date(year, month, d);
      const isoStr = iso(dt);
      try {
        const locSelect = document.getElementById('cc-location');
        const currentLoc = locSelect ? locSelect.value : null;
        const settings = window.__MP_LOCATION_SETTINGS__ ? window.__MP_LOCATION_SETTINGS__[currentLoc] : null;
        const weekday = dt.getDay();
        if (settings && settings.ranges) {
            const rangesForDay = settings.ranges[weekday] || [];
            if (!Array.isArray(rangesForDay) || rangesForDay.length === 0) {
              day.classList.add('disabled');
              day.disabled = true;
              day.setAttribute('aria-disabled','true');
            }
        }
      } catch (e) {
        // ignore
      }
      if (opts.min && isoStr < opts.min) { day.classList.add('disabled'); day.disabled=true; }
      if (opts.max && isoStr > opts.max) { day.classList.add('disabled'); day.disabled=true; }
      if (opts.value && isoStr === opts.value) { day.classList.add('selected'); }
      day.addEventListener('click', function(){ if (day.disabled) return; opts.onSelect(isoStr); });
      grid.appendChild(day);
    }

    container.appendChild(grid);

    if (opts && typeof opts.onNavigate === 'function') opts.onNavigate(year, month);

    // navigation handlers
    prev.addEventListener('click', (ev)=>{ ev.preventDefault(); ev.stopPropagation(); try{ ev.currentTarget && ev.currentTarget.focus(); }catch(e){}; const m = month-1<0 ? 11 : month-1; const y = month-1<0 ? year-1 : year; createCalendar(container, y, m, opts); });
    next.addEventListener('click', (ev)=>{ ev.preventDefault(); ev.stopPropagation(); try{ ev.currentTarget && ev.currentTarget.focus(); }catch(e){}; const m = month+1>11 ? 0 : month+1; const y = month+1>11 ? year+1 : year; createCalendar(container, y, m, opts); });

    header.tabIndex = 0;
    header.addEventListener('keydown', (ev)=>{
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); prev.click(); }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); next.click(); }
    });

  // Disable year/month chooser: clicking the title no longer opens the chooser.
  titleBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); ev.preventDefault(); /* chooser disabled */ });
    goBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); const y = Number(yearSelect.value); const m = Number(monthSelect.value); createCalendar(container, y, m, opts); chooser.style.display='none'; });
  }

  function positionPopup(popup, input){
    const r = input.getBoundingClientRect();
    const top = r.bottom + window.scrollY + 6;
    let left = r.left + window.scrollX;
    const maxRight = window.innerWidth - 20;
    if (left + popup.offsetWidth > maxRight) left = Math.max(10, maxRight - popup.offsetWidth);
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
  }

  function attachPicker(display, hidden){
    if (!display) return;
    if (!hidden){
      const targetId = display.dataset.datepickerTarget;
      if (targetId) hidden = document.getElementById(targetId);
    }
    if (!hidden){
      hidden = document.createElement('input'); hidden.type = 'hidden';
      const hidId = display.id ? `${display.id}-iso` : `dp-iso-${Math.random().toString(36).slice(2,8)}`;
      hidden.id = hidId; display.insertAdjacentElement('afterend', hidden);
    }

    if (!hidden.value) hidden.value = todayIso();
    display.value = formatDisplayFromISO(hidden.value);

    let popup = null;
    let lastYear = null;
    let lastMonth = null;

    let lastMouseDownInsidePopup = false;
    const onDocMouseUpGlobal = ()=>{ setTimeout(()=>{ lastMouseDownInsidePopup = false; }, 0); };

    const open = ()=>{
      if (popup) return;
      popup = document.createElement('div'); popup.className='mp-datepicker';
      popup.tabIndex = -1;
      document.body.appendChild(popup);

      const cur = parseISO(hidden.value) || new Date();
      const curYear = cur.getFullYear(); const curMonth = cur.getMonth();
      lastYear = curYear; lastMonth = curMonth;
      const min = todayIso(); const maxDate = new Date(); maxDate.setDate(maxDate.getDate()+30); const max = iso(maxDate);

      const opts = { min, max, value: hidden.value, onSelect: (isoStr)=>{
          hidden.value = isoStr; display.value = formatDisplayFromISO(isoStr); close(); hidden.dispatchEvent(new Event('input',{bubbles:true})); display.dispatchEvent(new Event('input',{bubbles:true}));
      }};
      opts.onNavigate = (y,m) => { lastYear = y; lastMonth = m; };

      createCalendar(popup, curYear, curMonth, opts);
      positionPopup(popup, display);
      setTimeout(()=> popup.classList.add('visible'), 10);
      try { popup.focus(); } catch(e){}

    const onKey = (ev)=>{ if (ev.key==='Escape') close(); };
  const onPopupMouseDown = (ev)=>{ lastMouseDownInsidePopup = true; setTimeout(()=>{ lastMouseDownInsidePopup = false; }, 500); };
      popup.addEventListener('mousedown', onPopupMouseDown);
      popup.addEventListener('pointerdown', onPopupMouseDown);
      popup.addEventListener('touchstart', onPopupMouseDown);
      const onPopupFocusIn = ()=>{ lastMouseDownInsidePopup = false; };
      popup.addEventListener('focusin', onPopupFocusIn);

      document.addEventListener('mouseup', onDocMouseUpGlobal);
      document.addEventListener('pointerup', onDocMouseUpGlobal);
      document.addEventListener('touchend', onDocMouseUpGlobal);
    // close on pointerdown outside for reliable fast interactions
    const onDocPointerDown = (ev)=>{ if (!popup) return; if (ev.target===display) return; if (!popup.contains(ev.target)) close(); };
    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onKey);

  popup._cleanup = ()=>{ document.removeEventListener('pointerdown', onDocPointerDown); document.removeEventListener('keydown', onKey); document.removeEventListener('mouseup', onDocMouseUpGlobal); document.removeEventListener('pointerup', onDocMouseUpGlobal); document.removeEventListener('touchend', onDocMouseUpGlobal); try { popup.removeEventListener('mousedown', onPopupMouseDown); } catch(e){} try { popup.removeEventListener('pointerdown', onPopupMouseDown); } catch(e){} try { popup.removeEventListener('touchstart', onPopupMouseDown); } catch(e){} try { popup.removeEventListener('focusin', onPopupFocusIn); } catch(e){} try { const locSelect = document.getElementById('cc-location'); if (locSelect && popup._onLocChange) locSelect.removeEventListener('change', popup._onLocChange); } catch(e){} };

      const locSelect = document.getElementById('cc-location');
      const onLocChange = ()=>{
        try {
          const curY = lastYear || (new Date()).getFullYear();
          const curM = lastMonth || (new Date()).getMonth();
          createCalendar(popup, curY, curM, opts);
          const hiddenVal = hidden.value;
          if (hiddenVal) {
            const dt = parseISO(hiddenVal);
            const wk = dt.getDay();
            const settings = window.__MP_LOCATION_SETTINGS__ ? window.__MP_LOCATION_SETTINGS__[locSelect.value] : null;
            const rangesForDay = settings && settings.ranges ? (settings.ranges[wk] || []) : [];
            if (!rangesForDay || rangesForDay.length === 0) {
              hidden.value = '';
              display.value = '';
              if (typeof window.showCCMessage === 'function') {
                window.showCCMessage('Le jour sélectionné est fermé pour le lieu choisi — veuillez choisir une autre date.', true);
              }
            }
          }
        } catch (e) {
          // ignore
        }
      };
      if (locSelect) locSelect.addEventListener('change', onLocChange);
      popup._onLocChange = onLocChange;
    };

    const close = ()=>{ if (!popup) return; popup._cleanup && popup._cleanup(); popup.remove(); popup=null; };

  display.addEventListener('focus', open);
  display.addEventListener('click', open);
  // remove blur-based close (causes races when clicking quickly).
  // We now rely on document click/focusin to close the popup which is more robust for fast interactions.
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
