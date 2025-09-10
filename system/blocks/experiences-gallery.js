// /system/blocks/experiences-gallery.js
// Carosello + overlay dettaglio (trigger da bottone ds-select)
// - Titolo stile Apple (come indicato)
// - UNICO elemento animato: la CARD clonata (testi restano dentro la card)
//   -> target visuale: 100vw x 60vh (FLIP), ancorata top:0 e full-width
// - Panel in Flexbox: [card (hero 60vh con card clonata assoluta)] + [container/tendina che clippa i testi]
// - Tendina parte nello stesso frame dell’espansione; in chiusura risale prima (maschera i testi), poi la card rientra
// - Overlay = unico scroll; pagina sotto bloccata
// - Carosello: snap fluido come prima (scroll-snap-stop: normal; niente forcing JS)
// - Salva e ripristina posizione esatta (rect + scroll pagina + scroll carosello)
(() => {
  if (customElements.get('experiences-gallery')) return;

  const ENTER_DUR  = 280;
  const STAGGER    = 60;
  const HERO_RATIO = 0.60; // 60% viewport height
  const OPEN_DUR   = 260;  // ease-in-out

  class ExperiencesGallery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      this._onScroll = this._onScroll.bind(this);
      this._raf = null;

      this._typeSpeed = 10;
      this._twTimer = null;

      this._restore = null; // per ripristino posizione

      // Dati (sheet completa)
      this._data = [
        {
          id:'rainbow',
          title:'Ketch',
          price:'€100/persona',
          img:'./assets/images/barca4.jpg',
          desc:'Elegante e stabile, con i suoi due alberi garantisce manovre più facili e bilanciate: la barca ideale per chi vuole imparare a gestire la vela con sicurezza e stile.',
          program:['09:30 – Briefing','10:00 – Manovre base','11:15 – Veleggiata','12:30 – Debrief'],
          meeting:'Molo 3, Marina di San Luca',
          tips:['Restate leggeri','Portate acqua (1L)','Cappello e crema SPF'],
          cancel:'Cancellazione gratuita fino a 48 ore prima.'
        },
        {
          id:'gourmet',
          title:'Schooner',
          price:'€100/persona',
          img:'./assets/images/barca2.jpg',
          desc:'Affascinante e intramontabile, richiama le grandi avventure d’altura.',
          program:['14:00 – Safety','14:30 – Regolazioni','15:30 – Pausa bagno','17:45 – Rientro'],
          meeting:'Capitaneria, pontile visitatori',
          tips:['Occhiali da sole','Scarpe suola chiara','Snack leggero'],
          cancel:'Flessibile fino a 24 ore prima.'
        },
        {
          id:'stella',
          title:'Sloop',
          price:'€100/persona',
          img:'./assets/images/barca3.jpg',
          desc:'Agile e veloce, barca scuola per eccellenza.',
          program:['10:00 – Teoria','10:30 – Esercizi','11:45 – Giro boe'],
          meeting:'Banchina nord, vela club',
          tips:['Giacca antivento','Borraccia','Custodia waterproof'],
          cancel:'Rimborso totale fino a 72 ore.'
        }
      ];

      this.shadowRoot.innerHTML = `
        <style>
          :host{
            --falloff: 260px;
            --scale-min: 0.94;
            --scale-max: 1.04;
            --opacity-min: 0.95;
            --gap: 32px;

            --pad-top: 2rem;
            --pad-bottom: 5rem;
            --pad-top-desktop: 3rem;

            /* tokens fallback */
            --c-fg: var(--neutral-50, #ffffff);
            --c-fg-muted: var(--neutral-300, #d1d5db);
            --c-scrim: rgba(2,6,23,.55);
            --c-surface: #0b1020;
            --radius-xl: 20px;

            display:block; width:100%;
            box-sizing:border-box;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
            color: var(--c-fg);
          }

          .page-container{ width:100%; }
          @media (min-width:900px){ .page-container{ max-width:1100px; margin-inline:auto; } }

          .head{ margin-top:8px; margin-bottom:4px; margin-left:1rem; }

          /* Titolo Apple-like richiesto */
          .headline{
            font-size:1.3rem; font-weight:700; line-height:1.2; margin:0 0 1rem 0;
            color:#0f172a; text-shadow:0 2px 6px rgba(0,0,0,.25);
          }
          .headline #tw{ display:inline-block; white-space:nowrap; }

          .subhead{ color:#475569; margin:0; font-size:clamp(.95rem, .8vw + .7rem, 1.05rem); line-height:1.45; }

          .wrap{ position:relative; }

          /* === Carosello full-bleed senza spazio extra ai lati === */
          /* Portiamo scroller a 100vw e lo centriamo rispetto alla pagina */
          .wrap,
          .scroller{
            width:100vw;
            margin-left:calc(50% - 50vw); /* full-bleed */
          }

          .scroller{
            display:flex; gap:var(--gap);
            padding: var(--pad-top) 0 var(--pad-bottom) 0; /* solo verticale */
            overflow-x:auto; overflow-y:hidden;
            -webkit-overflow-scrolling:touch;
            scroll-snap-type:x mandatory;
            scroll-padding-inline:0;      /* nessun padding che crei margini */
            touch-action: pan-x;          /* mobile: abilita swipe orizzontale */
            overscroll-behavior-x: contain;
          }
          .scroller::-webkit-scrollbar{ display:none; }
          .scroller > *{ flex:0 0 auto; scroll-snap-align:center; scroll-snap-stop: normal; }


          .scroller > :not(.spacer){
            transform:scale(var(--_scale,1));
            opacity:var(--_opacity,1));
            transition:transform 0s, opacity 0s;
            will-change: transform, opacity;
          }

          .dots{
            position:absolute; left:0; right:0; bottom:32px;
            display:flex; justify-content:center; gap:8px; pointer-events:none;
          }
          .dot{ width:6px; height:6px; border-radius:999px; background:rgba(255,255,255,.28); opacity:.95; transform:scale(1); transition:transform .18s, background-color .18s, opacity .18s; }
          .dot[aria-current="true"]{ background:#fff; transform:scale(1.25); }

          @media (min-width:501px){ .scroller{ padding-top: var(--pad-top-desktop); } }

          @keyframes card-in{ from{ opacity:0; transform:translateY(8px) scale(.985);} to{ opacity:1; transform:translateY(0) scale(1);} }
          .card-enter{ animation: card-in ${ENTER_DUR}ms cubic-bezier(.2,.7,.2,1) both; animation-delay: calc(var(--stagger-idx,0) * ${STAGGER}ms); }
          @media (prefers-reduced-motion: reduce){ .card-enter{ animation:none !important; } }

          /* ---------- Overlay ---------- */
          .overlay{
            position:fixed; inset:0; z-index:9999;
            background: rgba(0,0,0,0);
            transition: background .18s ease;
            overflow:auto;                /* unico scroll */
            -webkit-overflow-scrolling: touch;
          }
          .overlay.open{ background: var(--c-scrim); }

          /* === PANEL (struttura richiesta) === */
          .panel{
            display:flex; width:100%;
            flex-direction:column;
            height:fit-content;
            justify-content:center;
            align-items:center;
            gap:0;
          }

          /* area hero (60vh) che ospita la card clonata assoluta */
          .panel .card{
            position:relative;
            display:flex; width:100%;
            height:calc(${HERO_RATIO * 100}vh);
            align-items:stretch; justify-content:stretch;
            background: transparent; /* manteniamo il tuo design */
          }

          .float-card{
            position:absolute; left:0; top:0;
            transform-origin: top left;
            z-index:10001;
            pointer-events:auto;
            border-radius: var(--radius-xl);
            transition: transform ${OPEN_DUR}ms ease-in-out, border-radius ${OPEN_DUR}ms ease-in-out;
          }

          /* Tendina contenuti che clippa i testi */
          .panel .container{
            position:relative;
            display:flex; width:100%;
            height:0;                 /* chiusa */
            overflow:hidden;          /* maschera i testi */
            background: var(--c-surface);
            border-top-left-radius: var(--radius-xl);
            border-top-right-radius: var(--radius-xl);
            transition: height ${OPEN_DUR}ms ease-in-out, border-radius ${OPEN_DUR}ms ease-in-out;
          }
          .panel .container.open{
            height: var(--sheet-h, 0px); /* viene impostato via JS al contenuto */
            border-top-left-radius:0;
            border-top-right-radius:0;
          }

          /* Contenuto centrato, fit-content, con padding */
          .content{
            width: fit-content;
            max-width: min(100%, 1100px);
            padding: 0 18px 64px;
            margin-inline:auto;
            color:#e5e7eb;
            display:flex; flex-direction:column; align-items:center;
          }
          .content > *{ margin-block:1.5rem; }
          .content > *:first-child{ margin-top:1.25rem; }

          .title{ font-weight:800; font-size:clamp(1.25rem, 1.2vw + 1rem, 1.8rem); color:#fff; }
          .price{ color:#93c5fd; font-weight:700; }
          .desc{ color:#cbd5e1; line-height:1.55; }

          .h3{ font-weight:800; font-size:1.05rem; color:#fff; }
          ul{ padding-left:1.1rem; margin:0; }
          li{ margin:6px 0; }
          .meta{ color:#a5b4fc; }

          .close{
            position:fixed; right:14px; top:14px; z-index:10002;
            width:36px; height:36px; border-radius:999px;
            display:grid; place-items:center;
            background:rgba(0,0,0,.55); color:white; border:1px solid rgba(255,255,255,.25);
            backdrop-filter: blur(6px);
            cursor:pointer;
          }
        </style>

        <div class="page-container">
          <div class="head">
            <h2 class="headline" id="headline" aria-live="polite" aria-atomic="true"><span id="tw"></span></h2>
            <p class="subhead">Esplora la flotta e scegli l’imbarcazione ideale per il tuo weekend didattico.</p>
          </div>

          <div class="wrap">
            <div class="scroller" id="scroller">
              <div class="spacer" aria-hidden="true"></div>
              <!-- cards create dinamicamente -->
              <div class="spacer" aria-hidden="true"></div>
            </div>
            <div class="dots" id="dots" aria-hidden="true"></div>
          </div>
        </div>
      `;
    }

    connectedCallback(){
      this._renderList();

      const scroller = this.shadowRoot.getElementById('scroller');
      scroller.addEventListener('scroll', this._onScroll, { passive:true });

      this._ro = new ResizeObserver(() => this._updateSpacers(true));
      this._ro.observe(scroller);
      window.addEventListener('resize', () => this._updateSpacers(true));
      window.addEventListener('orientationchange', () => setTimeout(() => this._updateSpacers(true), 120));

      // Trigger SOLO dal bottone ds-button (evento 'ds-select')
      scroller.addEventListener('ds-select', (e) => {
        const card = e.composedPath().find(n => n?.tagName?.toLowerCase?.() === 'experience-card');
        if (!card) return;
        const id = card.getAttribute('id')?.replace('esperienza-','') || card.getAttribute('id') || '';
        const item = this._data.find(d => `esperienza-${d.id}` === card.getAttribute('id')) || this._data.find(d => d.id === id) || {
          id, title: card.getAttribute('title') || 'Titolo', img: card.getAttribute('image') || '', price: card.getAttribute('price') || '', desc: card.getAttribute('description') || '',
          program: [], meeting:'', tips:[], cancel:''
        };
        this._openDetail(item, card, scroller);
      });

      this._typeHeadline('La nostra flotta');

      requestAnimationFrame(() => { this._updateSpacers(true); this._updateVisuals(); });
    }

    disconnectedCallback(){
      const scroller = this.shadowRoot.getElementById('scroller');
      scroller?.removeEventListener('scroll', this._onScroll);
      this._ro?.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._twTimer){ clearTimeout(this._twTimer); this._twTimer = null; }
    }

    /* ---------- Render list ---------- */
    _renderList(){
      const scroller = this.shadowRoot.getElementById('scroller');
      const anchor = scroller.lastElementChild;
      const frag = document.createDocumentFragment();

      this._data.forEach((item, idx) => {
        const card = document.createElement('experience-card');
        card.setAttribute('id', `esperienza-${item.id}`);
        card.setAttribute('image', item.img);
        card.setAttribute('title', item.title);
        if (item.price) card.setAttribute('price', item.price);
        if (item.desc)  card.setAttribute('description', item.desc);

        // bottone CTA dentro la card
        const cta = document.createElement('ds-button');
        cta.setAttribute('slot','cta');
        cta.setAttribute('variant','with-icon-light');
        cta.setAttribute('size','md');
        cta.setAttribute('full','');
        cta.setAttribute('value', item.id);
        cta.innerHTML = `<span slot="text">Dettagli</span>`;
        card.appendChild(cta);

        card.classList.add('card-enter');
        card.style.setProperty('--stagger-idx', idx.toString());

        frag.appendChild(card);
      });

      scroller.insertBefore(frag, anchor);
      this._renderDots(this._data.length);

      setTimeout(() => {
        scroller.querySelectorAll('.card-enter').forEach(el => el.classList.remove('card-enter'));
      }, ENTER_DUR + (this._data.length - 1) * STAGGER + 20);
    }

    /* ---------- Typewriter ---------- */
    _typeHeadline(text){
      const tw = this.shadowRoot.getElementById('tw');
      if (!tw) return;
      if (this._twTimer){ clearTimeout(this._twTimer); this._twTimer=null; }
      tw.textContent = '';
      const step = (i=0) => {
        if (i > text.length) return;
        tw.textContent = text.slice(0, i);
        if (i < text.length){
          this._twTimer = setTimeout(() => step(i+1), this._typeSpeed);
        } else {
          this._twTimer = null;
        }
      };
      requestAnimationFrame(() => step(0));
    }

    /* ---------- Scroll FX ---------- */
    _onScroll(){ this._queueUpdate(); }
    _queueUpdate(){
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf=null; this._updateSpacers(); this._updateVisuals(); });
    }


    _updateVisuals(){
      const scroller = this.shadowRoot.getElementById('scroller');
      const hostRect = scroller.getBoundingClientRect();
      const hostCenterX = hostRect.left + hostRect.width / 2;

      const cs = getComputedStyle(scroller);
      const falloff = parseFloat(cs.getPropertyValue('--falloff')) || 260;
      const sMin = parseFloat(cs.getPropertyValue('--scale-min')) || 0.94;
      const sMax = parseFloat(cs.getPropertyValue('--scale-max')) || 1.04;
      const oMin = parseFloat(cs.getPropertyValue('--opacity-min')) || 0.95;

      const children = Array.from(scroller.children).filter(el => el.tagName && el.tagName.includes('-'));

      let best=null, bestDist=Infinity;
      for (const el of children){
        const r = el.getBoundingClientRect();
        const center = r.left + r.width/2;
        const dist = Math.abs(center - hostCenterX);

        const t = 1 - Math.min(dist / falloff, 1);
        const eased = 1 - (1 - t) * (1 - t);
        const scale = sMin + (sMax - sMin) * eased;
        const opacity = oMin + (1 - oMin) * eased;

        el.style.setProperty('--_scale', scale.toFixed(4));
        el.style.setProperty('--_opacity', opacity.toFixed(4));

        if (dist < bestDist){ bestDist = dist; best = el; }
      }

      if (best){
        const activeIndex = children.indexOf(best);
        this._updateDots(activeIndex);
      }
    }

    /* ---------- Dots ---------- */
    _renderDots(count){
      const dots = this.shadowRoot.getElementById('dots');
      if (!dots) return;
      dots.innerHTML = '';
      for (let i=0; i<count; i++){
        const d = document.createElement('i');
        d.className = 'dot'; d.setAttribute('role','presentation');
        dots.appendChild(d);
      }
      this._updateDots(0);
    }
    _updateDots(activeIndex){
      const dots = this.shadowRoot.getElementById('dots');
      if (!dots) return;
      const list = Array.from(dots.children);
      list.forEach((el, i) => {
        if (i === activeIndex) el.setAttribute('aria-current','true');
        else el.removeAttribute('aria-current');
      });
    }

    /* ---------- Overlay: panel con card (hero) + container (tendina) ---------- */
    _openDetail(item, cardEl, scroller){
      const rect = cardEl.getBoundingClientRect();

      // Salva posizione esatta e scroll correnti
      this._restore = {
        winX: window.scrollX,
        winY: window.scrollY,
        scrollerLeft: scroller.scrollLeft,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      };

      // Overlay + Panel (struttura richiesta)
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `
        <button class="close" aria-label="Chiudi">✕</button>
        <div class="panel">
          <div class="card">
            <span class="sr-only">immagine qui</span>
          </div>
          <div class="container">
            <div class="content" role="dialog" aria-modal="true" aria-label="${item.title}">
              ${item.price ? `<p class="price">${item.price}</p>` : ''}
              <h3 class="title">${item.title || ''}</h3>
              ${item.desc ? `<p class="desc">${item.desc}</p>` : ''}

              ${Array.isArray(item.program) && item.program.length ? `
                <div class="h3">Programma</div>
                <ul>${item.program.map(li => `<li>${li}</li>`).join('')}</ul>
              ` : ''}

              ${item.meeting ? `
                <div class="h3">Luogo di incontro</div>
                <p class="meta">${item.meeting}</p>
              ` : ''}

              ${Array.isArray(item.tips) && item.tips.length ? `
                <div class="h3">Consigli</div>
                <ul>${item.tips.map(li => `<li>${li}</li>`).join('')}</ul>
              ` : ''}

              ${item.cancel ? `
                <div class="h3">Politiche di cancellazione</div>
                <p class="desc">${item.cancel}</p>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      this.shadowRoot.appendChild(ov);

      const heroArea = ov.querySelector('.panel .card');
      const sheet = ov.querySelector('.panel .container');
      const content = ov.querySelector('.content');

      // Card clonata (assoluta sopra all'area hero)
      const clone = cardEl.cloneNode(true);
      clone.classList.add('float-card');
      clone.querySelectorAll('ds-button').forEach(b => b.setAttribute('disabled',''));
      heroArea.appendChild(clone);

      // Blocca completamente la pagina sotto
      this._lockPageScroll(true);

      // Stato iniziale = posizione attuale sullo schermo
      clone.style.transition = 'none';
      clone.style.transform = `translate(${rect.left}px, ${rect.top}px) scale(1)`;
      const startRadius = getComputedStyle(cardEl).borderRadius || '16px';
      clone.style.borderRadius = startRadius;
      clone.getBoundingClientRect(); // reflow

      // Target: 100vw x 60vh, ancorata in alto e a sinistra
      const viewportW = document.documentElement.clientWidth;
      const targetW = viewportW;
      const targetH = Math.round(window.innerHeight * HERO_RATIO);
      const scaleX  = targetW / rect.width;
      const scaleY  = targetH / rect.height;
      const finalX  = 0;
      const finalY  = 0;

      // Prepara altezza tendina = altezza contenuto (animiamo via CSS var)
      requestAnimationFrame(() => {
        const h = content.scrollHeight + 64; // include padding bottom
        sheet.style.setProperty('--sheet-h', `${h}px`);
      });

      // Avvia animazione immagine + tendina (stesso frame)
      requestAnimationFrame(() => {
        ov.classList.add('open');

        clone.style.transition = `transform ${OPEN_DUR}ms ease-in-out, border-radius ${OPEN_DUR}ms ease-in-out`;
        clone.style.transform  = `translate(${finalX}px, ${finalY}px) scale(${scaleX}, ${scaleY})`;
        clone.style.borderRadius = '0px';

        sheet.classList.add('open'); // la tendina scende e clippa i testi
      });

      const close = () => this._closeDetail(ov, sheet, clone, startRadius, scroller);
      ov.querySelector('.close').addEventListener('click', close);
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey, { once:true });
      ov._removeEsc = () => document.removeEventListener('keydown', onKey);
    }

    _closeDetail(ov, sheet, clone, startRadius, scroller){
      // 1) Chiudi PRIMA la tendina (clippa e nasconde i testi)
      sheet.classList.remove('open');

      // 2) Dopo che la tendina è salita un po', richiama la card
      const WAIT = Math.max(OPEN_DUR * 0.55, 140);
      setTimeout(() => {
        // Ripristina scroll dello sfondo/carousel PRIMA del posizionamento
        if (this._restore){
          window.scrollTo(this._restore.winX, this._restore.winY);
          scroller.scrollTo({ left: this._restore.scrollerLeft, behavior: 'auto' });
        }

        const r0 = this._restore?.rect;
        if (r0){
          const dur = Math.max(OPEN_DUR-40, 220);
          clone.style.transition = `transform ${dur}ms ease-in-out, border-radius ${dur}ms ease-in-out`;
          clone.style.transform  = `translate(${r0.left}px, ${r0.top}px) scale(1)`;
          clone.style.borderRadius = startRadius;

          setTimeout(() => {
            ov._removeEsc?.();
            ov.remove();
            this._lockPageScroll(false);
            this._restore = null;
          }, dur + 40);
        } else {
          // Fallback
          clone.style.transition = 'opacity .18s ease-in-out';
          clone.style.opacity = '0';
          setTimeout(() => {
            ov._removeEsc?.();
            ov.remove();
            this._lockPageScroll(false);
          }, 200);
        }
      }, WAIT);
    }

    _lockPageScroll(lock){
      if (lock){
        this._prevOverflow = document.body.style.overflow;
        this._prevTouchAct = document.body.style.touchAction;
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';   // blocca gesture di fondo (overlay ha scroll suo)
      } else {
        document.body.style.overflow = this._prevOverflow || '';
        document.body.style.touchAction = this._prevTouchAct || '';
        this._prevOverflow = null;
        this._prevTouchAct = null;
      }
    }
  }

  customElements.define('experiences-gallery', ExperiencesGallery);
})();
