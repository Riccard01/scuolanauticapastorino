// /system/blocks/experiences-gallery.js
// Carosello semplice di "experience-card":
// - Titolo a sinistra + sottotitolo
// - Scroll orizzontale con snap + leggero scaling
// - Dots scuri (per sfondo chiaro)
// - Nessuna logica di form, nessun tab, nessuno shine

(() => {
  if (customElements.get('experiences-gallery')) return;

  const ENTER_DUR = 280; // ms
  const STAGGER   = 60;  // ms tra una card e la successiva

  class ExperiencesGallery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      this._onScroll = this._onScroll.bind(this);
      this._raf = null;

      // Typewriter per il titolo (senza caret)
      this._typeSpeed = 10; // ms per carattere
      this._twTimer = null;

      // Dati (solo "esperienza")
      this._data = [
        { id:'rainbow', title:'Ketch',    price:'€100/persona',  img:'./assets/images/barca4.jpg', desc:'Elegante e stabile, con i suoi due alberi garantisce manovre più facili e bilanciate: la barca ideale per chi vuole imparare a gestire la vela con sicurezza e stile.' },
        { id:'gourmet', title:'Schooner', price:'€100/persona',  img:'./assets/images/barca2.jpg', desc:'Affascinante e intramontabile, con le sue vele imponenti richiama le grandi avventure d’altura: perfetta per vivere l’emozione della tradizione marinara.' },
        { id:'stella',  title:'Sloop',    price:'€100/persona', img:'./assets/images/barca3.jpg', desc:'Agile e veloce, con un solo albero e manovre semplici è la barca scuola per eccellenza: immediata da comprendere e divertente da condurre fin dal primo bordo.' },
      ];

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
          .container{
            width:100%;
          }
          @media (min-width: 900px){
            .container{
              max-width: 1100px;
              margin-inline: auto;
            }
          }

          /* Titolo: sinistra + sottotitolo */
          .head{
            margin-top: 8px;
            margin-bottom: 4px;
            margin-left: 1rem;
          }
          .headline{
            margin: 0 0 6px 0;
            font-weight: 800;
            font-size: clamp(1.25rem, 1.6vw + .8rem, 2rem);
            line-height: 1.15;
            text-align: left;

            /* sfumatura "Apple-like" ma sobria */
            background: linear-gradient(to bottom, #0f172a, #334155);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
          }
          .headline #tw{
            display:inline-block;
            white-space: nowrap;
          }
          .subhead{
            margin: 0;
            color: #475569;
            font-size: clamp(.95rem, .8vw + .7rem, 1.05rem);
            line-height: 1.45;
            text-align: left;
          }

          /* Wrapper scroller */
          .wrap { position: relative; }

          /* Scroller orizzontale con snap */
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

          /* Card: solo scaling/opacity (nessuno shine) */
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
            background: rgba(17,24,39,.30);   /* scuro */
            transform: scale(1);
            transition: transform .18s ease, background-color .18s ease, opacity .18s;
            opacity: .95;
          }
          .dot[aria-current="true"]{
            background: #111827;              /* scuro pieno */
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
        </style>

        <div class="container">
          <div class="head">
            <h2 class="headline" id="headline" aria-live="polite" aria-atomic="true">
              <span id="tw"></span>
            </h2>
            <p class="subhead" id="sub">Esplora la flotta e scegli l’imbarcazione ideale per il tuo weekend didattico.</p>
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

      this._ro = new ResizeObserver(() => this._queueUpdate());
      this._ro.observe(scroller);

      // Titolo typewriter
      this._typeHeadline('La nostra flotta');

      requestAnimationFrame(() => this._queueUpdate());
    }

    disconnectedCallback() {
      const scroller = this.shadowRoot.getElementById('scroller');
      scroller?.removeEventListener('scroll', this._onScroll);
      this._ro?.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._twTimer) { clearTimeout(this._twTimer); this._twTimer = null; }
    }

    // ---------- Render semplice (niente form) ----------
    _renderList() {
      const scroller = this.shadowRoot.getElementById('scroller');
      const anchor = scroller.lastElementChild; // spacer finale
      const frag = document.createDocumentFragment();

      this._data.forEach((item, idx) => {
        const card = document.createElement('experience-card');
        card.setAttribute('id', `esperienza-${item.id}`);
        card.setAttribute('image', item.img);
        card.setAttribute('title', item.title);
        if (item.price) card.setAttribute('price', item.price);
        if (item.desc)  card.setAttribute('description', item.desc);

        card.classList.add('card-enter');
        card.style.setProperty('--stagger-idx', idx.toString());

        frag.appendChild(card);
      });

      scroller.insertBefore(frag, anchor);
      this._renderDots(this._data.length);

      // Pulizia classi 'card-enter'
      setTimeout(() => {
        scroller.querySelectorAll('.card-enter').forEach(el => el.classList.remove('card-enter'));
      }, ENTER_DUR + (this._data.length - 1) * STAGGER + 20);
    }

    // ---------- Typewriter (titolo) ----------
    _typeHeadline(text){
      const tw = this.shadowRoot.getElementById('tw');
      if (!tw) return;
      if (this._twTimer) { clearTimeout(this._twTimer); this._twTimer = null; }
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

    // ---------- Scroll FX (solo scaling + dots) ----------
    _onScroll() { this._queueUpdate(); }
    _queueUpdate() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._updateSpacers();
        this._updateVisuals();
      });
    }

    _updateSpacers() {
      const scroller = this.shadowRoot.getElementById('scroller');
      const items = Array.from(scroller.children).filter(el => el.tagName && el.tagName.includes('-'));
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

    _updateVisuals() {
      const scroller = this.shadowRoot.getElementById('scroller');
      const hostRect = scroller.getBoundingClientRect();
      const hostCenterX = hostRect.left + hostRect.width / 2;

      const cs = getComputedStyle(scroller);
      const falloff = parseFloat(cs.getPropertyValue('--falloff')) || 260;
      const sMin = parseFloat(cs.getPropertyValue('--scale-min')) || 0.94;
      const sMax = parseFloat(cs.getPropertyValue('--scale-max')) || 1.04;
      const oMin = parseFloat(cs.getPropertyValue('--opacity-min')) || 0.95;

      const children = Array.from(scroller.children).filter(el => el.tagName && el.tagName.includes('-'));

      let best = null, bestDist = Infinity;

      for (const el of children) {
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - hostCenterX);

        const t = 1 - Math.min(dist / falloff, 1); // 0..1
        const eased = 1 - (1 - t) * (1 - t);       // easeOutQuad

        const scale = sMin + (sMax - sMin) * eased;
        const opacity = oMin + (1 - oMin) * eased;

        el.style.setProperty('--_scale', scale.toFixed(4));
        el.style.setProperty('--_opacity', opacity.toFixed(4));

        if (dist < bestDist) { bestDist = dist; best = el; }
      }

      // Aggiorna i dots (niente data-active -> nessun glow esterno)
      if (best) {
        const activeIndex = children.indexOf(best);
        this._updateDots(activeIndex);
      }
    }

    // ---------- Dots ----------
    _renderDots(count){
      const dots = this.shadowRoot.getElementById('dots');
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
      const dots = this.shadowRoot.getElementById('dots');
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
