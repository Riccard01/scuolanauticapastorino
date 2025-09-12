// /system/blocks/reviews-gallery.js (stacked, negative overlap, start centered + titolo)
(() => {
  if (customElements.get('reviews-gallery')) return;

  class ReviewsGallery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._onScroll = this._onScroll.bind(this);
      this._raf = null;

      this.shadowRoot.innerHTML = `
        <style>
          :host{
            display:block;
            position:relative;
            width:100%;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);

            /* <-- evita che il componente allarghi la pagina */
            overflow-x: clip;               /* migliore di hidden per i layout moderni */
            contain: layout paint;          /* isola il layout interno */
          }

          .container{ width:100%; }
          @media (min-width: 900px){
            .container{ max-width: 1100px; margin-inline:auto; }
          }

          .head{ margin-top:8px; margin-bottom:4px; margin-left:1rem; }
          .headline{
            margin:0 0 6px 0; font-weight:800;
            font-size:clamp(1.25rem, 1.6vw + .8rem, 2rem); line-height:1.15; text-align:left;
            background: linear-gradient(to bottom,#0f172a,#334155);
            -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent;
          }
          .subhead{ margin:0; color:#475569; font-size:clamp(.95rem,.8vw + .7rem,1.05rem); line-height:1.45; text-align:left; }

          .scroller{
            opacity:0; transition:opacity .15s ease !important;
            overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch;
            scroll-snap-type:x mandatory; padding-block:24px;

            /* sicurezza extra: lo scroller non deve mai eccedere il viewport */
            max-inline-size: 100%;
            contain: content;
          }
          :host([data-ready="true"]) .scroller{ opacity:1; }
          .scroller::-webkit-scrollbar{ display:none; }

          .row{
            display:flex; align-items:stretch; gap:0;
            min-width:max-content;            /* serve per gli stack sovrapposti */
            padding-inline:16px; box-sizing:border-box; margin:0;
          }

          .row > review-card{
            flex:0 0 auto;
            scroll-snap-align:center; scroll-snap-stop:always;
            position:relative;
            transition: transform .15s cubic-bezier(.2,.8,.2,1) !important, opacity .15s !important;
            transform: translateY(36px) scale(.9);
            opacity:.8; z-index:1;
          }

          .row > review-card + review-card{ margin-left: calc(-1 * var(--overlap, 48px)); }

          .row > review-card[data-pos="left"]{  transform: translateY(24px) rotate(-6deg) scale(.9); z-index:2; opacity:.9; }
          .row > review-card[data-pos="right"]{ transform: translateY(24px) rotate(6deg)  scale(.9); z-index:2; opacity:.9; }
          .row > review-card[data-active]{      transform: translateY(0) rotate(0)    scale(1);  z-index:3; opacity:1; }

          /* Spacer laterali: centrano la prima/ultima card senza allargare la pagina */
          .spacer{
            flex:0 0 auto;
            /* 50% del viewport meno la "sbirciata" (peek), ma MAI negativo e MAI oltre 50svw */
            inline-size: clamp(8px, calc(50svw - var(--peek, 110px)), 50svw);
          }
        </style>

        <div class="container">
          <div class="head">
            <h2 class="headline">Programma del corso</h2>
            <p class="subhead">Dalle basi della vela alle manovre avanzate, un percorso completo passo passo.</p>
          </div>

          <div class="scroller">
            <div class="row">
              <div class="spacer" aria-hidden="true"></div>

              <review-card
                image="./assets/images/knot.png"
                title="Manovre Correnti"
                description="Scopri le basi per gestire le cime e le manovre fondamentali in totale sicurezza."
                tag="1 ora">
              </review-card>

              <review-card
                image="./assets/images/bussola.png"
                title="Andature"
                description="Impara a riconoscere e governare le diverse andature a vela, dal lasco alla bolina."
                tag="5 ore">
              </review-card>

              <review-card
                image="./assets/images/winch.png"
                title="Manovre di Evoluzione"
                description="Approfondisci le virate e le strambate per condurre l’imbarcazione con agilità."
                tag="5 ore">
              </review-card>

              <review-card
                image="./assets/images/galloccia.png"
                title="Ormeggio e Disormeggio"
                description="Tecniche pratiche per entrare e uscire dal porto in sicurezza e senza stress."
                tag="2 ore">
              </review-card>

              <div class="spacer" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      `;
    }

    connectedCallback(){
      const scroller = this.shadowRoot.querySelector('.scroller');
      scroller.addEventListener('scroll', this._onScroll, { passive: true });

      requestAnimationFrame(() => {
        const items = this._items();
        const defaultIndex = Math.floor(Math.max(0, items.length - 1) / 2);
        const idxAttr = this.getAttribute('start-index');
        const startIndex = Number.isFinite(+idxAttr) ? Math.min(Math.max(+idxAttr,0), Math.max(0, items.length-1)) : defaultIndex;
        this._centerIndex(startIndex, true);
        this._updateActive();
        this.setAttribute('data-ready','true');
      });

      this._ro = new ResizeObserver(() => {
        const activeIdx = this._activeIndex();
        if (activeIdx >= 0) this._centerIndex(activeIdx, true);
        this._updateActive();
      });
      this._ro.observe(this);
    }

    disconnectedCallback(){
      const scroller = this.shadowRoot.querySelector('.scroller');
      scroller?.removeEventListener('scroll', this._onScroll);
      if (this._ro) this._ro.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    _onScroll(){
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = null; this._updateActive(); });
    }

    _items(){ return Array.from(this.shadowRoot.querySelectorAll('.row > review-card')); }
    _activeIndex(){ return this._items().findIndex(el => el.hasAttribute('data-active')); }

    _centerIndex(index, instant=false){
      const items = this._items();
      const target = items[index];
      if (!target) return;
      const host = this.shadowRoot.querySelector('.scroller');
      const hostRect = host.getBoundingClientRect();
      const centerX = hostRect.left + hostRect.width / 2;
      const r = target.getBoundingClientRect();
      const targetCenterX = r.left + r.width / 2;
      const delta = targetCenterX - centerX;
      host.scrollTo({ left: host.scrollLeft + delta, behavior: instant ? 'auto' : 'smooth' });
    }

    _updateActive(){
      const hostRect = this.shadowRoot.querySelector('.scroller').getBoundingClientRect();
      const centerX = hostRect.left + hostRect.width / 2;
      const items = this._items();
      if (!items.length) return;
      let best = null, bestDist = Infinity;
      for (const el of items){
        const r = el.getBoundingClientRect();
        const elCenterX = r.left + r.width / 2;
        const dist = Math.abs(elCenterX - centerX);
        if (dist < bestDist){ bestDist = dist; best = el; }
      }
      items.forEach(el => { el.removeAttribute('data-active'); el.removeAttribute('data-pos'); });
      if (best){
        best.setAttribute('data-active','');
        const idx = items.indexOf(best);
        if (items[idx - 1]) items[idx - 1].setAttribute('data-pos','left');
        if (items[idx + 1]) items[idx + 1].setAttribute('data-pos','right');
      }
    }
  }

  customElements.define('reviews-gallery', ReviewsGallery);
})();
