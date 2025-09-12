// /system/blocks/experiences-gallery.js
// Stile INVARIATO (experience-card). Desktop: dynamic-carousel | carousel.

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

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            /* FX scroller */
            --falloff: 260px;
            --scale-min: 0.94;
            --scale-max: 1.04;
            --opacity-min: 0.95;

            --gap: 32px;

            /* padding separati */
            --pad-inline: 16px;
            --pad-top: 2rem;
            --pad-bottom: 5rem;
            --pad-top-desktop: 3rem;

            display: block;
            width: 100%;
            box-sizing: border-box;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
          }

          /* Contenitore max-width per desktop */
          .container{ width:100%; }
          @media (min-width: 900px){
            .container{
              max-width: 1100px;
              margin-inline: auto;
            }
          }

          /* Wrapper scroller */
          .wrap { position: relative; }

          /* === CAROUSEL (default) === */
          .scroller {
            display: flex; flex-direction: row; gap: var(--gap);
            padding: var(--pad-top) 0 var(--pad-bottom) 0;
            width: 100%; box-sizing: border-box;

            overflow-x: auto; overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x mandatory;
          }
          .scroller::-webkit-scrollbar { display: none; }
          .scroller > * { flex: 0 0 auto; scroll-snap-align: center; scroll-snap-stop: normal; }

          /* Card: scaling/opacity (nessuno shine) */
          .scroller > :not(.spacer) {
            position: relative;
            transform: scale(var(--_scale, 1));
            opacity: var(--_opacity, 1);
            transition: transform 0s, opacity 0s;
            will-change: transform, opacity;
          }

          /* Spacers ai lati (dinamici) */
          .spacer { display: block; flex: 0 0 12px; scroll-snap-align: none; pointer-events: none; }

          /* Dots scuri (per sfondo bianco) */
          .dots{
            position: absolute; left: 0; right: 0; bottom: 32px;
            display: flex; justify-content: center; gap: 8px;
            pointer-events: none;
          }
          .dot{
            inline-size: 6px; block-size: 6px; border-radius: 999px;
            background: rgba(17,24,39,.30);
            transform: scale(1);
            transition: transform .18s ease, background-color .18s ease, opacity .18s;
            opacity: .95;
          }
          .dot[aria-current="true"]{
            background: #111827;
            transform: scale(1.25);
          }

          @media (min-width: 501px){
            .scroller { padding-top: var(--pad-top-desktop); }
          }

          /* Entrata iniziale delle card */
          @keyframes card-in { from { opacity:0; transform: translateY(8px) scale(.985); } to { opacity:1; transform: translateY(0) scale(1);} }
          .card-enter{ animation: card-in ${ENTER_DUR}ms cubic-bezier(.2,.7,.2,1) both; animation-delay: calc(var(--stagger-idx, 0) * ${STAGGER}ms); }
          @media (prefers-reduced-motion: reduce) {
            .card-enter { animation: none !important; }
          }

          /* === GRID (desktop dinamico senza carosello) === */
          :host([data-mode="grid"]) .scroller{
            overflow: visible;               /* niente scroll */
            scroll-snap-type: none;
          }
          :host([data-mode="grid"]) .scroller{
            justify-content: center;         /* centratura orizzontale */
          }
          :host([data-mode="grid"]) .scroller > :not(.spacer){
            transform: none !important;
            opacity: 1 !important;
          }
          :host([data-mode="grid"]) .spacer,
          :host([data-mode="grid"]) .dots{
            display: none !important;        /* niente spacers/dots in grid */
          }
        </style>

        <div class="container">
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

      this.$scroller = this.shadowRoot.getElementById('scroller');
      this.$dots     = this.shadowRoot.getElementById('dots');

      this.$scroller.addEventListener('scroll', this._onScroll, { passive: true });

      // Resize + MQ per calcolare la modalità
      this._ro = new ResizeObserver(() => { this._recomputeMode(); this._queueUpdate(); });
      this._ro.observe(this.$scroller);

      this._mql = window.matchMedia(DESKTOP_MQ);
      this._mqHandler = () => this._recomputeMode(true);
      this._mql.addEventListener?.('change', this._mqHandler);

      requestAnimationFrame(() => {
        this._recomputeMode(true);
        this._queueUpdate();
      });
    }

    disconnectedCallback() {
      this.$scroller?.removeEventListener('scroll', this._onScroll);
      this._ro?.disconnect();
      this._mql?.removeEventListener?.('change', this._mqHandler);
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    /* ---------- Render semplice (niente form) ---------- */
_renderList() {
  const scroller = this.shadowRoot.getElementById('scroller');
  const anchor = scroller.lastElementChild; // spacer finale
  const frag = document.createDocumentFragment();

  // ARRAY DATI (con immagini locali)
  const demo = [
    {
      title: 'Schooner',
      price: '€150/persona',
      desc:  'Agile e veloce.',
      images: ['/assets/images/sloop1.jpg',
        '/assets/images/sloop2.jpg',
        '/assets/images/sloop3.jpg',
        '/assets/images/sloop4.jpg',
        '/assets/images/sloop5.jpg',
        '/assets/images/sloop6.jpg',
        '/assets/images/sloop7.jpg',
        '/assets/images/sloop8.jpg',
      ]
    },
    {
      title: 'Sloop',
      price: '€150/persona',
      desc:  'Affascinante e intramontabile.',
      images: ['/assets/images/barca1.jpg','/assets/images/barca1.jpg']
    }
  ];

  demo.forEach((item, idx) => {
    const card = document.createElement('experience-card');
    card.setAttribute('title', item.title);
    card.setAttribute('price', item.price);
    card.setAttribute('description', item.desc);

    // 👉 Popoliamo lo slot "slide" con <img> locali
    item.images.forEach(src => {
      const img = document.createElement('img');
      img.slot = 'slide';
      img.src = src;
      img.loading = 'lazy';
      card.appendChild(img);
    });

    card.classList.add('card-enter');
    card.style.setProperty('--stagger-idx', idx.toString());

    frag.appendChild(card);
  });

  scroller.insertBefore(frag, anchor);

  // dots iniziali (in carousel)
  this._renderDots(this._items().length);
}


    /* ---------- Modalità responsive ---------- */
    _recomputeMode(forceCenter=false){
      const isDesktop = window.matchMedia(DESKTOP_MQ).matches;
      const pref = (this.getAttribute('desktop') || 'dynamic-carousel').toLowerCase(); // 'dynamic-carousel' | 'carousel'

      let mode = 'carousel';
      if (isDesktop){
        mode = (pref === 'carousel') ? 'carousel' : (this._hasOverflow() ? 'carousel' : 'grid');
      } // mobile → carousel

      this.dataset.mode = mode;

      if (mode === 'grid'){
        this.$dots.style.display = 'none';
      } else {
        this.$dots.style.display = '';
        this._renderDots(this._items().length);
        if (forceCenter) this._centerIndex(this._defaultIndex(), true);
        this._updateVisuals();
      }
    }

    _hasOverflow(){
      // se il contenuto totale è più largo dell'area visibile, serve il carosello
      const scroller = this.$scroller;
      return (scroller.scrollWidth - scroller.clientWidth) > 1;
    }

    /* ---------- Scroll FX (solo in carousel) ---------- */
    _onScroll(){ if (this.dataset.mode === 'carousel') this._queueUpdate(); }

    _queueUpdate() {
      if (this.dataset.mode !== 'carousel') return;
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._updateSpacers();
        this._updateVisuals();
      });
    }

    _items(){ 
      const scroller = this.shadowRoot.getElementById('scroller');
      return Array.from(scroller.children).filter(el => el.tagName && el.tagName.includes('-'));
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

    _updateSpacers() {
      if (this.dataset.mode !== 'carousel') return;
      const scroller = this.$scroller;
      const items = this._items();
      if (!items.length) return;

      const hostRect = scroller.getBoundingClientRect();
      if (hostRect.width === 0) return;

      const firstRect = items[0].getBoundingClientRect();
      const lastRect  = items[items.length - 1].getBoundingClientRect();
      if (firstRect.width === 0 || lastRect.width === 0) return;

      const leftNeeded  = Math.max(12, (hostRect.width - firstRect.width) / 2);
      const rightNeeded = Math.max(12, (hostRect.width - lastRect.width)  / 2);

      const spacers = Array.from(scroller.querySelectorAll('.spacer'));
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

    // easing per scala/opacità dinamiche (senza toccare lo stile della card)
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

  // NIENTE data-active -> nessun glow blu
  items.forEach(el => { el.removeAttribute('data-pos'); });

  if (best){
    const idx = items.indexOf(best);
    if (items[idx - 1]) items[idx - 1].setAttribute('data-pos','left');
    if (items[idx + 1]) items[idx + 1].setAttribute('data-pos','right');
  }

  const activeIndex = best ? items.indexOf(best) : 0;
  this._updateDots(activeIndex);
}


    /* ---------- Dots ---------- */
    _renderDots(count){
      const dots = this.$dots;
      if (!dots) return;
      dots.innerHTML = '';
      for (let i = 0; i < count; i++){
        const d = document.createElement('i');
        d.className = 'dot';
        d.setAttribute('role','presentation');
        dots.appendChild(d);
      }
      this._updateDots(0);
    }

    _updateDots(activeIndex){
      if (this.dataset.mode !== 'carousel') return;
      const dots = this.$dots;
      if (!dots) return;
      const list = Array.from(dots.children);
      list.forEach((el, i) => {
        if (i === activeIndex) el.setAttribute('aria-current','true');
        else el.removeAttribute('aria-current');
      });
    }
  }

  customElements.define('experiences-gallery', ExperiencesGallery);
})();
