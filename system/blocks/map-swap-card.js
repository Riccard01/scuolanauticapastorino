class MapSwapCard extends HTMLElement {
  static get observedAttributes() { return ['lat','lng','img','title','subtitle']; }

  constructor(){
    super();
    this.attachShadow({ mode:'open' });
    this._lat = parseFloat(this.getAttribute('lat') || '44.409220');
    this._lng = parseFloat(this.getAttribute('lng') || '8.924081');
    this._img = this.getAttribute('img') || '';
    this._title = this.getAttribute('title') || 'La tua destinazione';
    this._subtitle = this.getAttribute('subtitle') || 'Visualizza la posizione e ottieni il percorso in un clic.';
    this._ro = null;

    this.shadowRoot.innerHTML = `
      <style>
        :host{
          display:block;
          width:100%;
          font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
        }

        /* Contenitore generale centrato */
        .container{
          width:100%;
          max-width: 1100px;
          margin-inline:auto;
          padding-inline: clamp(12px, 4vw, 24px);
          display:flex;
          flex-direction:column;
          align-items:center;
        }

        /* Testata (titolo/sottotitolo) centrata e responsive */
        .head{
          margin-top: 8px;
          margin-bottom: 12px;
          text-align:center;
          width:100%;
        }
        .headline{
          margin: 0 0 6px 0;
          font-weight: 800;
          font-size: clamp(1.15rem, 1.2vw + 1rem, 2rem);
          line-height: 1.15;
          background: linear-gradient(to bottom, #0f172a, #334155);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .subhead{
          margin: 0;
          color: #475569;
          font-size: clamp(.95rem, .6vw + .75rem, 1.05rem);
          line-height: 1.45;
        }

        /* Wrapper della card: responsive + proporzioni fisse */
        .wrapper{
          position:relative;
          width: min(100%, var(--card-max, 720px));
          /* Mantiene proporzioni: 5:3 di default */
          aspect-ratio: var(--card-ratio, 5 / 3);
        }

        .card{
          position:absolute;
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(2,6,23,.12), 0 2px 8px rgba(2,6,23,.08);
          overflow:hidden;
          background:#fff;
          transition: transform .6s ease, width .6s ease, height .6s ease, box-shadow .6s ease, inset .6s ease;
          border: 3px solid #fff;
          outline: none;
        }
        .card, .card * { -webkit-tap-highlight-color: transparent; }
        .card *:focus { outline:none; }

        /* Stato "main" occupa tutto il wrapper */
        .main{
          inset:0;
          z-index:1;
          display:flex;
          flex-direction:column;
          justify-content:flex-end;
          transform: translate(0,0) rotate(0deg);
        }

        /* Stato "mini": dimensioni e posizione responsive in basso a destra */
        .mini{
          /* dimensione responsive: tra 84 e 140px, cresce con la viewport */
          width: clamp(84px, 18vw, 140px);
          height: clamp(84px, 18vw, 140px);
          right: clamp(8px, 4%, 24px);
          bottom: clamp(8px, 6%, 28px);
          left: auto; top: auto;
          transform: rotate(8deg);
          z-index:2;
          cursor:pointer;
          border: 3px solid #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,.28);
          pointer-events:auto;
        }

        .map{
          position:absolute;
          inset:0;
          background-size:cover;
          background-position:center;
        }

        /* Pin centrale visibile solo nella main */
        .main .pin-overlay{
          position:absolute;
          top:50%; left:50%;
          width: clamp(22px, 2.2vw, 32px);
          height: clamp(22px, 2.2vw, 32px);
          transform:translate(-50%,-100%);
          background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="red" viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/></svg>') center/contain no-repeat;
          pointer-events:none;
        }

        /* Nella mini nascondo mappa/bottone e mostro un piccolo pin */
        .mini .map, .mini .button-container{ display:none; }
        .mini::after{
          content:"";
          position:absolute;
          top:50%; left:50%;
          width: clamp(18px, 1.8vw, 26px);
          height: clamp(18px, 1.8vw, 26px);
          transform:translate(-50%,-60%);
          background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="red" viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/></svg>') center/contain no-repeat;
          pointer-events:none;
        }

        ::slotted(img){
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }

        .button-container{
          position:absolute;
          left:0; right:0; bottom:0;
          padding: clamp(10px, 1.6vw, 14px);
          display:flex; align-items:center; justify-content:center;
          pointer-events:auto;
          background: linear-gradient(to top, rgba(0,0,0,.08), transparent);
        }

        ds-button{ width:100%; }
        ds-button::part(button){
          width:100%;
          background:#0f172a !important;
          color:#fff !important;
          border-color:#0f172a !important;
        }

        /* Piccole ottimizzazioni mobile */
        @media (max-width: 420px){
          .wrapper{ --card-ratio: 4 / 3; } /* un filo più alto su schermi stretti */
        }
      </style>

      <div class="container">
        <div class="head">
          <h2 class="headline"></h2>
          <p class="subhead"></p>
        </div>

        <div class="wrapper" id="wrapper">
          <div class="card main" id="mapCard" role="region" aria-label="Mappa">
            <div class="map"></div>
            <div class="pin-overlay" aria-hidden="true"></div>
            <div class="button-container">
              <ds-button variant="solid-dark" size="md">
                <span slot="text">Vedi percorso</span>
              </ds-button>
            </div>
          </div>

          <div class="card mini" id="hintCard" role="button" aria-label="Indizio visivo (tocca per scambiare)">
            <slot name="mini"></slot>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback(){
    // Titolo/sottotitolo iniziali
    this._syncHead();

    // Prima render + observer per resize (aggiorna Static Map ai nuovi px)
    this._updateMap();
    const wrapper = this.shadowRoot.getElementById('wrapper');
    this._ro = new ResizeObserver(() => this._updateMap());
    this._ro.observe(wrapper);

    // Swap solo cliccando sull'elemento attualmente "mini"
    this.shadowRoot.querySelectorAll('.card').forEach(c => {
      c.addEventListener('click', (e)=>{
        if (e.currentTarget.classList.contains('mini')) {
          e.stopPropagation();
          this._swap();
        }
      });
    });

    // Bottone percorso
    const btn = this.shadowRoot.querySelector('ds-button');
    if (btn) {
      btn.addEventListener('ds-select', (e) => {
        e.stopPropagation();
        this._onRouteClick();
      });
    }
  }

  disconnectedCallback(){
    if (this._ro) this._ro.disconnect();
  }

  attributeChangedCallback(name, _, val){
    if(name==='lat') this._lat = parseFloat(val);
    if(name==='lng') this._lng = parseFloat(val);
    if(name==='img') this._img = val || '';
    if(name==='title') { this._title = val || ''; this._syncHead(); }
    if(name==='subtitle') { this._subtitle = val || ''; this._syncHead(); }
    this._updateMap();
  }

  _syncHead(){
    const h = this.shadowRoot.querySelector('.headline');
    const s = this.shadowRoot.querySelector('.subhead');
    if (h) h.textContent = this._title || '';
    if (s) s.textContent = this._subtitle || '';
  }

  _updateMap(){
    const map = this.shadowRoot.querySelector('.map');
    const wrapper = this.shadowRoot.getElementById('wrapper');
    if(!map || !wrapper) return;

    // Se è impostata un'immagine personalizzata, usala sempre
    if (this._img) {
      map.style.backgroundImage = `url("${this._img}")`;
      return;
    }

    // Calcola dimensioni correnti del wrapper (responsive) e componi Static Map
    const rect = wrapper.getBoundingClientRect();
    // Limiti Static Maps standard: max 640x640 per 'size' (usa scale=2 per retina)
    const width = Math.max(200, Math.min(640, Math.round(rect.width)));
    const height = Math.max(160, Math.min(640, Math.round(rect.height)));
    const zoom = 15;
    const scale = 2; // retina
    const marker = `markers=color:red%7C${this._lat},${this._lng}`;
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${this._lat},${this._lng}&zoom=${zoom}&size=${width}x${height}&scale=${scale}&${marker}`;

    map.style.backgroundImage = `url("${url}")`;
  }

  _swap(){
    const mapCard  = this.shadowRoot.getElementById('mapCard');
    const hintCard = this.shadowRoot.getElementById('hintCard');
    mapCard.classList.toggle('main');
    mapCard.classList.toggle('mini');
    hintCard.classList.toggle('main');
    hintCard.classList.toggle('mini');
  }

  _onRouteClick(){
    const openSearch = () =>
      window.open(`https://www.google.com/maps/search/?api=1&query=${this._lat},${this._lng}`, '_blank', 'noopener');

    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        const {latitude,longitude}=pos.coords;
        window.open(
          `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${this._lat},${this._lng}`,
          '_blank','noopener'
        );
      }, openSearch, { enableHighAccuracy:true, maximumAge:10000, timeout:8000 });
    } else {
      openSearch();
    }
  }
}

customElements.define('map-swap-card', MapSwapCard);
