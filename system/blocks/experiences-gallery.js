// /system/blocks/experiences-gallery.js
// Carosello + overlay dettaglio (trigger da bottone ds-select)
// - Titolo stile Apple (come indicato)
// - UNICO elemento animato: la CARD clonata (testi restano dentro la card)
//   -> target visuale: 100vw x 60vh (scalata con FLIP), centrata orizzontalmente e top:0
// - Sheet height: 100vw, parte SUBITO (stesso frame) dell’espansione immagine
// - Quando aperto: blocca lo scroll della pagina; overlay scrollabile (anche “partendo dall’immagine”)
// - Mobile centering robusto (offsetWidth + snap al più vicino)
// - Salva posizione esatta (rect + scroll pagina + scroll carosello) e la ripristina alla chiusura
(() => {
  if (customElements.get('experiences-gallery')) return;

  const ENTER_DUR = 280;
  const STAGGER   = 60;
  const HERO_RATIO = 0.60; // 60% viewport height
  const OPEN_DUR  = 260;   // animazione rapida
  const SHEET_LAG = 0;     // sheet nello stesso frame

  class ExperiencesGallery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      this._onScroll = this._onScroll.bind(this);
      this._onScrollEnd = this._onScrollEnd.bind(this);
      this._raf = null;
      this._endTimer = null;

      this._typeSpeed = 10;
      this._twTimer = null;

      this._restore = null; // per ripristino posizione

      // Dati demo (arricchiti per la sheet)
      this._data = [
        {
          id:'rainbow',
          title:'Ketch',
          price:'€100/persona',
          img:'./assets/images/barca4.jpg',
          desc:'Elegante e stabile, con i suoi due alberi garantisce manovre più facili e bilanciate: la barca ideale per chi vuole imparare a gestire la vela con sicurezza e stile.',
          program: [
            '09:30 – Briefing di sicurezza e divisione ruoli',
            '10:00 – Uscita e manovre base (virate/abbattute)',
            '11:15 – Veleggiata costiera e prove di timone',
            '12:30 – Rientro in porto e debrief'
          ],
          meeting: 'Molo 3, Marina di San Luca',
          tips: [
            'Restate leggeri: zaino compatto.',
            'Portate acqua (almeno 1L a persona).',
            'Cappello e crema solare consigliati.'
          ],
          cancel: 'Cancellazione gratuita fino a 48 ore prima. In caso di meteo avverso rimborso o riprogrammazione.'
        },
        {
          id:'gourmet',
          title:'Schooner',
          price:'€100/persona',
          img:'./assets/images/barca2.jpg',
          desc:'Affascinante e intramontabile, con le sue vele imponenti richiama le grandi avventure d’altura: perfetta per vivere l’emozione della tradizione marinara.',
          program: [
            '14:00 – Presentazioni e safety',
            '14:30 – Uscita, regolazioni vele',
            '15:30 – Ancoraggio e pausa bagno',
            '17:45 – Rientro'
          ],
          meeting: 'Capitaneria, pontile visitatori',
          tips: [
            'Occhiali da sole e telo mare.',
            'Scarpe con suola chiara.',
            'Acqua + snack leggero.'
          ],
          cancel: 'Cancellazione flessibile fino a 24 ore prima. In caso di mare mosso, cambio data.'
        },
        {
          id:'stella',
          title:'Sloop',
          price:'€100/persona',
          img:'./assets/images/barca3.jpg',
          desc:'Agile e veloce, con un solo albero e manovre semplici è la barca scuola per eccellenza: immediata da comprendere e divertente da condurre fin dal primo bordo.',
          program: [
            '10:00 – Cenni di teoria in banchina',
            '10:30 – Uscita ed esercizi al lasco',
            '11:45 – Giro boe e rientro'
          ],
          meeting: 'Banchina nord, vela club',
          tips: [
            'Giacca antivento leggera.',
            'Borraccia ricaricabile.',
            'Custodia waterproof per il telefono.'
          ],
          cancel: 'Rimborso totale fino a 72 ore; poi penale 50% (salvo maltempo).'
        }
      ];

      this.shadowRoot.innerHTML = `
        <style>
          :host {
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

            display:block; width:100%; box-sizing:border-box;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
            color: var(--c-fg);
          }

          .container{ width:100%; }
          @media (min-width:900px){ .container{ max-width:1100px; margin-inline:auto; } }

          .head{ margin-top:8px; margin-bottom:4px; margin-left:1rem; }

          /* Titolo "La nostra flotta" – stile Apple indicato */
          .headline{
            font-size: 1.3rem;
            font-weight: 700;
            line-height: 1.2;
            margin: 0 0 1rem 0;
            color: #0f172a;
            text-shadow: 0 2px 6px rgba(0,0,0,0.25);
          }
          .headline #tw{ display:inline-block; white-space:nowrap; }

          .subhead{
            color: #475569;
            margin:0;
            font-size:clamp(.95rem, .8vw + .7rem, 1.05rem);
            line-height:1.45; text-align:left;
          }

          .wrap{ position:relative; }

          .scroller{
            display:flex; gap:var(--gap);
            padding: var(--pad-top) 0 var(--pad-bottom) 0;
            overflow-x:auto; overflow-y:hidden;
            -webkit-overflow-scrolling:touch;
            scroll-snap-type:x mandatory;
            scroll-snap-stop:always;
          }
          .scroller::-webkit-scrollbar{ display:none; }
          .scroller > *{ flex:0 0 auto; scroll-snap-align:center; }

          .spacer{ flex:0 0 12px; pointer-events:none; }

          .scroller > :not(.spacer){
            transform:scale(var(--_scale,1));
            opacity:var(--_opacity,1);
            transition:transform 0s, opacity 0s;
            will-change: transform, opacity;
          }

          .dots{
            position:absolute; left:0; right:0; bottom:32px;
            display:flex; justify-content:center; gap:8px; pointer-events:none;
          }
          .dot{
            width:6px; height:6px; border-radius:999px;
            background: rgba(255,255,255,.28); opacity:.95;
            transform:scale(1);
            transition: transform .18s ease, background-color .18s ease, opacity .18s;
          }
          .dot[aria-current="true"]{ background:#fff; transform:scale(1.25); }

          @media (min-width:501px){ .scroller{ padding-top: var(--pad-top-desktop); } }

          @keyframes card-in{ from{ opacity:0; transform:translateY(8px) scale(.985);} to{ opacity:1; transform:translateY(0) scale(1);} }
          .card-enter{ animation: card-in ${ENTER_DUR}ms cubic-bezier(.2,.7,.2,1) both; animation-delay: calc(var(--stagger-idx,0) * ${STAGGER}ms); }
          @media (prefers-reduced-motion: reduce){ .card-enter{ animation:none !important; } }

          /* ---------- Overlay/panel ---------- */
          .overlay{
            position:fixed; inset:0; z-index:9999;
            background: rgba(0,0,0,0);
            transition: background .18s ease;
            overflow:auto; /* unico scroll per tutta la sezione */
            -webkit-overflow-scrolling: touch;
          }
          .overlay.open{ background: var(--c-scrim); }

          /* Contenitore unico che ospita card (hero) + sheet */
          .panel{
            position:relative;
            min-height: 100vh;
          }

          /* Card clonata che si espande (UNICA immagine + testi dentro) */
          .float-card{
            position:absolute;
            transform-origin: top left;
            z-index:10001;
            pointer-events:auto;
            border-radius: var(--radius-xl); /* iniziale = card */
            transition: transform ${OPEN_DUR}ms cubic-bezier(.2,.7,.2,1), border-radius ${OPEN_DUR}ms ease;
          }

          /* Sheet attaccata all'immagine, senza gap */
          .sheet{
            position:absolute;
            left:0; top: calc(${HERO_RATIO} * 100vh); /* 60vh esatti -> attaccata */
            width:100vw; height:0;
            background: var(--c-surface);
            border-top-left-radius: var(--radius-xl);
            border-top-right-radius: var(--radius-xl);
            transition: height ${OPEN_DUR}ms cubic-bezier(.2,.7,.2,1), border-radius ${OPEN_DUR}ms ease;
            will-change: height, border-radius;
            z-index:10000;
            overflow:visible; /* nessuno scroll interno */
            display:flex;              /* richiesto */
            align-items:center;        /* richiesto */
            justify-content:center;    /* per centrare orizzontalmente il contenuto */
          }
          .sheet.open{
            height:100vw;
            border-top-left-radius: 0;
            border-top-right-radius: 0;
          }

          /* Contenuto centrato, fit-content e margini interni 1.5rem (senza creare gap sopra) */
          .content{
            width: fit-content;
            max-width: min(100%, 1100px);
            padding: 0 18px 64px;
            color:#e5e7eb;
          }
          .content > *{ margin-block: 1.5rem; }
          .content > *:first-child{ margin-top: 0; } /* niente gap con l’immagine */

          .title{ font-weight:800; font-size: clamp(1.25rem, 1.2vw + 1rem, 1.8rem); color:#fff; }
          .price{ color:#93c5fd; font-weight:700; }
          .desc{ color:#cbd5e1; line-height:1.55; }

          .h3{ font-weight:800; font-size:1.05rem; color:#fff; }
          ul{ padding-left: 1.1rem; margin:0; }
          li{ margin: 6px 0; }
          .meta{ color:#a5b4fc; }

          .close{
            position: fixed; right: 14px; top: 14px; z-index: 10002;
            width: 36px; height:36px; border-radius: 999px;
            display:grid; place-items:center;
            background: rgba(0,0,0,.55); color:white; border:1px solid rgba(255,255,255,.25);
            backdrop-filter: blur(6px);
            cursor:pointer;
          }
        </style>

        <div class="container">
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

    connectedCallback() {
      this._renderList();

      const scroller = this.shadowRoot.getElementById('scroller');
      scroller.addEventListener('scroll', this._onScroll, { passive: true });
      ['scrollend','touchend','mouseup'].forEach(ev =>
        scroller.addEventListener(ev, this._onScrollEnd, { passive:true })
      );

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
      scroller?.removeEventListener('scrollend', this._onScrollEnd);
      scroller?.removeEventListener('touchend', this._onScrollEnd);
      scroller?.removeEventListener('mouseup', this._onScrollEnd);
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

    /* ---------- Scroll FX + centering ---------- */
    _onScroll(){
      if (this._endTimer) clearTimeout(this._endTimer);
      this._endTimer = setTimeout(this._onScrollEnd, 120);
      this._queueUpdate();
    }
    _queueUpdate(){
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._updateSpacers();
        this._updateVisuals();
      });
    }

    _updateSpacers(force=false){
      const scroller = this.shadowRoot.getElementById('scroller');
      const items = Array.from(scroller.children).filter(el => el.tagName && el.tagName.includes('-'));
      if (!items.length) return;

      const hostW = scroller.clientWidth;
      const firstW = items[0].offsetWidth;
      const lastW  = items[items.length - 1].offsetWidth;

      const leftNeeded  = Math.max(12, (hostW - firstW) / 2);
      const rightNeeded = Math.max(12, (hostW - lastW)  / 2);

      const spacers = Array.from(scroller.querySelectorAll('.spacer'));
      if (spacers[0]) spacers[0].style.flexBasis = `${Math.round(leftNeeded)}px`;
      if (spacers[1]) spacers[1].style.flexBasis = `${Math.round(rightNeeded)}px`;

      if (force) this._onScrollEnd();
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

    _onScrollEnd = () => {
      const scroller = this.shadowRoot.getElementById('scroller');
      const items = Array.from(scroller.children).filter(el => el.tagName && el.tagName.includes('-'));
      if (!items.length) return;

      const hostCenter = scroller.clientWidth / 2;
      let best = null, bestDist = Infinity, bestLeft = 0;

      items.forEach(el => {
        const left = el.offsetLeft + el.offsetWidth/2 - hostCenter;
        const dist = Math.abs(left - scroller.scrollLeft);
        if (dist < bestDist){ bestDist = dist; best = el; bestLeft = left; }
      });

      const target = Math.max(0, Math.min(bestLeft, scroller.scrollWidth - scroller.clientWidth));
      if (Math.abs(scroller.scrollLeft - target) > 6){
        scroller.scrollTo({ left: target, behavior:'smooth' });
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

    /* ---------- Overlay: panel con card clonata + sheet ---------- */
    _openDetail(item, cardEl, scroller){
      const rect = cardEl.getBoundingClientRect();

      // Salva posizione esatta e scroll correnti
      this._restore = {
        winX: window.scrollX,
        winY: window.scrollY,
        scrollerLeft: scroller.scrollLeft,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      };

      // Overlay + Panel
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `
        <button class="close" aria-label="Chiudi">✕</button>
        <div class="panel">
          <div class="sheet">
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

      const panel = ov.querySelector('.panel');
      const sheet = ov.querySelector('.sheet');

      // Card clonata dentro il panel (figlia del contenitore unico)
      const clone = cardEl.cloneNode(true);
      clone.classList.add('float-card');
      // disattiva interattività interna durante overlay
      clone.querySelectorAll('ds-button').forEach(b => b.setAttribute('disabled',''));
      panel.appendChild(clone);

      // Blocca scroll pagina sotto
      this._lockPageScroll(true);

      // Stato iniziale = posizione esatta sullo schermo (senza animare)
      clone.style.transition = 'none';
      clone.style.transform = `translate(${rect.left}px, ${rect.top}px) scale(1)`;
      const startRadius = getComputedStyle(cardEl).borderRadius || '16px';
      clone.style.borderRadius = startRadius;
      // forza reflow per fissare lo stato iniziale
      clone.getBoundingClientRect();

      // Target: 100vw x 60vh, centrato orizzontalmente e top 0 (spostamento + scala)
      const targetW = window.innerWidth;
      const targetH = Math.round(window.innerHeight * HERO_RATIO);
      const scaleX  = targetW / rect.width;
      const scaleY  = targetH / rect.height;
      const finalX  = (targetW - rect.width * scaleX) / 2; // centrato orizzontalmente
      const finalY  = 0;                                   // top: 0

      // Attiva transizione e avvia animazioni nello stesso frame
      requestAnimationFrame(() => {
        ov.classList.add('open');

        clone.style.transition = `transform ${OPEN_DUR}ms cubic-bezier(.2,.7,.2,1), border-radius ${OPEN_DUR}ms ease`;
        clone.style.transform  = `translate(${finalX}px, ${finalY}px) scale(${scaleX}, ${scaleY})`;
        clone.style.borderRadius = '0px';

        // Sheet parte nello stesso frame (zero lag) e resta attaccata all’immagine
        sheet.classList.add('open');
      });

      const close = () => this._closeDetail(ov, panel, sheet, clone, cardEl, startRadius, scroller);
      ov.querySelector('.close').addEventListener('click', close);
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey, { once:true });
      ov._removeEsc = () => document.removeEventListener('keydown', onKey);
    }

    _closeDetail(ov, panel, sheet, clone, cardEl, startRadius, scroller){
      // Ripristina scroll della pagina e del carosello PRIMA del ricalcolo del rect
      if (this._restore){
        window.scrollTo(this._restore.winX, this._restore.winY);
        scroller.scrollTo({ left: this._restore.scrollerLeft, behavior: 'auto' });
      }

      // Usa le coordinate salvate all'apertura per tornare esattamente lì
      const r0 = this._restore?.rect;
      if (r0){
        const dur = Math.max(OPEN_DUR-40, 220);
        clone.style.transition = `transform ${dur}ms cubic-bezier(.2,.7,.2,1), border-radius ${dur}ms ease`;
        clone.style.transform  = `translate(${r0.left}px, ${r0.top}px) scale(1)`;
        clone.style.borderRadius = startRadius;

        // Chiudi la sheet nello stesso istante (speculare)
        sheet?.classList?.remove('open');

        setTimeout(() => {
          ov._removeEsc?.();
          ov.remove();
          clone.remove();
          this._lockPageScroll(false);
          this._restore = null;
        }, dur + 60);
      } else {
        // Fallback
        sheet?.classList?.remove('open');
        clone.style.transition = 'opacity .18s ease';
        clone.style.opacity = '0';
        setTimeout(() => {
          ov._removeEsc?.();
          ov.remove();
          clone.remove();
          this._lockPageScroll(false);
        }, 200);
      }
    }

    _lockPageScroll(lock){
      if (lock){
        this._prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = this._prevOverflow || '';
        this._prevOverflow = null;
      }
    }
  }

  customElements.define('experiences-gallery', ExperiencesGallery);
})();
