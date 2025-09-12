// /system/blocks/experiences-gallery.js
// Usa <experience-card> (stile tuo, invariato). Mobile: sempre carousel.
// Desktop: desktop="dynamic-carousel" (grid centrata se non c'è overflow) | "carousel".
// La gallery inietta <img slot="slide"> dentro ogni experience-card in base al dataset.

(() => {
  if (customElements.get('experiences-gallery')) return;

  const ENTER_DUR = 280;
  const STAGGER   = 60;
  const DESKTOP_MQ = '(min-width: 900px)';

  class ExperiencesGallery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._onScroll = this._onScroll.bind(this);
      this._raf = null;

      // ---- DATASET con immagini (modifica liberamente i path) ----
      this._data = {
        esperienza: [
          { id:'rainbow', title:'Full Day',    price:'€650 per group', img:'./assets/images/portofino.jpg',   desc:'Una giornata intera di esplorazione nel golfo di Portofino' },
          { id:'half',    title:'Half Day',    price:'€450 per group', img:'./assets/images/portofino.jpg',   desc:'Goditi mezza giornata di bagno a Bogliasco' },
          { id:'gourmet', title:'Gourmet Sunset', price:'€390 per group', img:'./assets/images/genovese.jpg', desc:'Tramonto con degustazione a bordo.' },
          { id:'stella',  title:'Stella Maris',   price:'€1200 per group', img:'./assets/images/special.jpg', desc:'Camogli e San Fruttuoso con aperitivo.' },
          { id:'firew',   title:'Recco Fireworks',price:'€1200 per group', img:'./assets/images/fireworks.jpg',desc:'Notte di fuochi dal mare.' },
        ],
        barca: [
          { id:'gozzo',  title:'Leggera',        price:'Incluso',  img:'./assets/images/leggera.jpg',  desc:'Classico e confortevole.' },
          { id:'rib',    title:'Gozzo Ligure',   price:'+ €90',    img:'./assets/images/barca2.jpg',   desc:'Agile e veloce.' },
          { id:'yacht',  title:'Piccolo Yacht',  price:'+ €350',   img:'./assets/images/barca3.jpg',   desc:'Eleganza e spazio.' },
        ],
        cibo: [
          { id:'focaccia', title:'Prosciutto e melone',            price:'+ €30', img:'./assets/images/melone.jpg',   desc:'Tipico ligure.' },
          { id:'crudo',    title:'Insalata di anguria e cipolle',  price:'+ €80', img:'./assets/images/anguria.jpg',  desc:'Selezione del giorno.' },
          { id:'veget',    title:'Vegetariano',                    price:'+ €25', img:'./assets/images/couscous.jpg', desc:'Fresco e leggero.' },
        ],
        porto: [
          { id:'camogli',   title:'Porto Antico', price:'—', img:'./assets/images/portoantico.jpg',  desc:'Partenza dal molo principale.' },
          { id:'portofino', title:'Portofino',    price:'—', img:'./assets/images/portofino.jpg',    desc:'Iconico borgo.' },
          { id:'recco',     title:'Recco',        price:'—', img:'./assets/images/porto1.jpg',       desc:'Comodo parcheggio.' },
        ]
      };

      this.shadowRoot.innerHTML = `
        <style>
          :host{
            display:block; position:relative; width:100%;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
            overflow-x: clip; contain: layout paint;

            --gap: 32px;
            --overlap: 48px; /* sovrapposizione fra card */
          }

          .container{ width:100%; }
          @media (min-width:900px){ .container{ max-width:1100px; margin-inline:auto; } }

          .wrap{ position:relative; }

          /* --- CAROUSEL --- */
          .scroller{
            opacity:0; transition:opacity .15s ease !important;
            overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch;
            scroll-snap-type:x mandatory; padding-block:24px;
            max-inline-size:100%; contain:content;
            display:flex; align-items:stretch; gap:0;
          }
          :host([data-ready="true"]) .scroller{ opacity:1; }
          .scroller::-webkit-scrollbar{ display:none; }

          .spacer{
            flex:0 0 auto;
            inline-size: clamp(8px, calc(50svw - var(--peek, 110px)), 50svw);
            scroll-snap-align:none;
          }

          /* card come elementi diretti dello scroller */
          .scroller > experience-card{
            flex:0 0 auto;
            scroll-snap-align:center; scroll-snap-stop:always;
            position:relative;

            /* trasformazione composta con variabili per lo scroll-FX */
            --_r: 0deg;        /* rotazione */
            --_s: .9;          /* scala dinamica */
            --_ty: 36px;       /* translateY */
            --_o: .8;          /* opacità */
            transform: translateY(var(--_ty)) rotate(var(--_r)) scale(var(--_s));
            opacity: var(--_o);
            transition: transform .15s cubic-bezier(.2,.8,.2,1) !important, opacity .15s !important;
            z-index:1;
          }
          .scroller > experience-card + experience-card{ margin-left: calc(-1 * var(--overlap)); }

          .scroller > experience-card[data-pos="left"]{
            --_r: -6deg; --_ty: 24px; --_o: .9;
          }
          .scroller > experience-card[data-pos="right"]{
            --_r: 6deg;  --_ty: 24px; --_o: .9;
          }
          .scroller > experience-card[data-active]{
            --_r: 0deg;  --_ty: 0px;  --_s: 1; --_o: 1;
            z-index:3;
          }

          /* Dots del carosello esterno */
          .dots{
            position:absolute; left:0; right:0; bottom:32px;
            display:flex; justify-content:center; gap:8px; pointer-events:none;
          }
          .dot{
            inline-size:6px; block-size:6px; border-radius:999px;
            background: rgba(17,24,39,.30);
            transform: scale(1);
            transition: transform .18s ease, background-color .18s ease, opacity .18s;
            opacity:.95;
          }
          .dot[aria-current="true"]{ background:#111827; transform: scale(1.25); }

          /* --- GRID (desktop senza carosello) --- */
          :host([data-mode="grid"]) .scroller{
            overflow:visible; scroll-snap-type:none; padding-bottom:2rem;
            justify-content:center; gap: var(--gap);
          }
          :host([data-mode="grid"]) .scroller > experience-card{
            margin-left:0 !important;
            --_r: 0deg; --_ty: 0px; --_s: 1; --_o: 1; /* statico, centrato */
          }
          :host([data-mode="grid"]) .spacer,
          :host([data-mode="grid"]) .dots{ display:none !important; }

          /* entrata */
          @keyframes card-in{ from{opacity:0; transform: translateY(8px) scale(.985);} to{opacity:1; transform: translateY(0) scale(1);} }
          .card-enter{ animation: card-in ${ENTER_DUR}ms cubic-bezier(.2,.7,.2,1) both; animation-delay: calc(var(--stagger-idx,0) * ${STAGGER}ms); }
          @media (prefers-reduced-motion: reduce){ .card-enter{ animation:none !important; } }
        </style>

        <div class="container">
          <div class="wrap">
            <div class="scroller" id="scroller">
              <div class="spacer" aria-hidden="true"></div>
              <!-- cards dinamiche qui -->
              <div class="spacer" aria-hidden="true"></div>
            </div>
            <div class="dots" id="dots" aria-hidden="true"></div>
          </div>
        </div>
      `;
    }

    connectedCallback(){
      this.$scroller = this.shadowRoot.getElementById('scroller');
      this.$dots     = this.shadowRoot.getElementById('dots');

      this._renderList(); // crea le experience-card + inietta <img slot="slide">

      this.$scroller.addEventListener('scroll', this._onScroll, { passive:true });

      this._ro = new ResizeObserver(() => { this._recomputeMode(); this._queueUpdate(); });
      this._ro.observe(this.$scroller);

      this._mql = window.matchMedia(DESKTOP_MQ);
      this._mqHandler = () => this._recomputeMode(true);
      this._mql.addEventListener?.('change', this._mqHandler);

      requestAnimationFrame(() => {
        this._recomputeMode(true);
        this._queueUpdate();
        this.setAttribute('data-ready','true');
      });
    }

    disconnectedCallback(){
      this.$scroller?.removeEventListener('scroll', this._onScroll);
      this._ro?.disconnect();
      this._mql?.removeEventListener?.('change', this._mqHandler);
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    /* ---------- Render cards e SLIDES ---------- */
    _renderList(){
      const section = (this.getAttribute('section') || 'esperienza').toLowerCase();
      const items = this._data[section] || [];

      const anchor = this.$scroller.lastElementChild; // spacer finale
      const frag = document.createDocumentFragment();

      items.forEach((item, idx) => {
        const card = document.createElement('experience-card');
        card.setAttribute('id', `${section}-${item.id}`);
        if (item.title) card.setAttribute('title', item.title);
        if (item.price) card.setAttribute('price', item.price);
        if (item.desc)  card.setAttribute('description', item.desc);
        if (item.filters) card.setAttribute('filters', item.filters);

        // immagini: se item.images esiste usa quelle, altrimenti fallback a item.img
        const slides = Array.isArray(item.images) && item.images.length ? item.images : (item.img ? [item.img] : []);
        slides.forEach(src => {
          const img = document.createElement('img');
          img.slot = 'slide';
          img.loading = 'lazy';
          img.decoding = 'async';
          img.src = src;
          img.alt = item.title || 'slide';
          card.appendChild(img);
        });

        card.classList.add('card-enter');
        card.style.setProperty('--stagger-idx', idx.toString());
        frag.appendChild(card);
      });

      this.$scroller.insertBefore(frag, anchor);

      // dots esterni = numero di card
      this._renderDots(this._items().length);

      // pulizia animazioni d’entrata
      setTimeout(() => {
        this.$scroller.querySelectorAll('.card-enter').forEach(el => el.classList.remove('card-enter'));
      }, ENTER_DUR + (items.length - 1) * STAGGER + 20);
    }

    /* ---------- Modalità responsive ---------- */
    _recomputeMode(forceCenter=false){
      const isDesktop = window.matchMedia(DESKTOP_MQ).matches;
      const pref = (this.getAttribute('desktop') || 'dynamic-carousel').toLowerCase(); // 'dynamic-carousel' | 'carousel'

      let mode = 'carousel';
      if (isDesktop){
        mode = (pref === 'carousel') ? 'carousel' : (this._hasOverflow() ? 'carousel' : 'grid');
      }
      this.dataset.mode = mode;

      if (mode === 'grid'){
        this.$dots.style.display = 'none';
      } else {
        this.$dots.style.display = '';
        this._renderDots(this._items().length);
        if (forceCenter) this._centerIndex(this._defaultIndex(), true);
        this._updateVisuals(); // scroll FX + posizioni + dots
      }
    }

    _hasOverflow(){
      // overflow se la larghezza scrollabile supera la visibile (tolti i due spacer)
      const sc = this.$scroller;
      return (sc.scrollWidth - sc.clientWidth) > 1;
    }

    /* ---------- Scroll FX (carousel) ---------- */
    _onScroll(){ if (this.dataset.mode === 'carousel') this._queueUpdate(); }

    _queueUpdate(){
      if (this.dataset.mode !== 'carousel') return;
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._updateSpacers();
        this._updateVisuals();
      });
    }

    _items(){
      return Array.from(this.$scroller.children)
        .filter(el => el.tagName && el.tagName.toLowerCase() === 'experience-card');
    }

    _defaultIndex(){
      const items = this._items();
      return Math.floor(Math.max(0, items.length - 1) / 2);
    }

    _centerIndex(index, instant=false){
      if (this.dataset.mode !== 'carousel') return;
      const items = this._items();
      const target = items[index];
      if (!target) return;
      const host = this.$scroller;
      const hostRect = host.getBoundingClientRect();
      const centerX = hostRect.left + hostRect.width / 2;
      const r = target.getBoundingClientRect();
      const targetCenterX = r.left + r.width / 2;
      const delta = targetCenterX - centerX;
      host.scrollTo({ left: host.scrollLeft + delta, behavior: instant ? 'auto' : 'smooth' });
    }

    _updateSpacers(){
      if (this.dataset.mode !== 'carousel') return;
      const items = this._items();
      if (!items.length) return;

      const hostRect = this.$scroller.getBoundingClientRect();
      if (hostRect.width === 0) return;

      const firstRect = items[0].getBoundingClientRect();
      const lastRect  = items[items.length - 1].getBoundingClientRect();
      if (firstRect.width === 0 || lastRect.width === 0) return;

      const leftNeeded  = Math.max(12, (hostRect.width - firstRect.width) / 2);
      const rightNeeded = Math.max(12, (hostRect.width - lastRect.width)  / 2);

      const spacers = this.$scroller.querySelectorAll('.spacer');
      if (spacers[0]) spacers[0].style.flexBasis = `${Math.round(leftNeeded)}px`;
      if (spacers[1]) spacers[1].style.flexBasis = `${Math.round(rightNeeded)}px`;
    }

    _updateVisuals(){
      if (this.dataset.mode !== 'carousel') return;

      const hostRect = this.$scroller.getBoundingClientRect();
      const centerX = hostRect.left + hostRect.width / 2;
      const items = this._items();
      if (!items.length) return;

      let best = null, bestDist = Infinity;

      for (const el of items){
        const r = el.getBoundingClientRect();
        const elCenterX = r.left + r.width / 2;
        const dist = Math.abs(elCenterX - centerX);

        // easing per scala/opacity dinamiche
        const falloff = 260;
        const t = 1 - Math.min(dist / falloff, 1);
        const eased = 1 - (1 - t) * (1 - t);

        const sMin = 0.94, sMax = 1.04, oMin = 0.95;
        const s = sMin + (sMax - sMin) * eased;
        const o = oMin + (1 - oMin) * eased;

        el.style.setProperty('--_s', s.toFixed(4));
        el.style.setProperty('--_o', o.toFixed(4));

        if (dist < bestDist){ bestDist = dist; best = el; }
      }

      // posizioni e attivo (per rotazioni/translate)
      items.forEach(el => { el.removeAttribute('data-active'); el.removeAttribute('data-pos'); });
      if (best){
        best.setAttribute('data-active','');
        const idx = items.indexOf(best);
        if (items[idx - 1]) items[idx - 1].setAttribute('data-pos','left');
        if (items[idx + 1]) items[idx + 1].setAttribute('data-pos','right');
      }

      // dots esterni
      const activeIndex = best ? items.indexOf(best) : 0;
      this._updateDots(activeIndex);
    }

    /* ---------- Dots esterni ---------- */
    _renderDots(count){
      const dots = this.$dots;
      if (!dots) return;
      dots.innerHTML = '';
      for (let i=0;i<count;i++){
        const d = document.createElement('i');
        d.className = 'dot';
        d.setAttribute('role','presentation');
        dots.appendChild(d);
      }
      this._updateDots(0);
    }
    _updateDots(activeIndex){
      if (this.dataset.mode !== 'carousel') return;
      const list = Array.from(this.$dots.children);
      list.forEach((el,i) => {
        if (i === activeIndex) el.setAttribute('aria-current','true');
        else el.removeAttribute('aria-current');
      });
    }
  }

  customElements.define('experiences-gallery', ExperiencesGallery);
})();
