class MapSwapCard extends HTMLElement {
  static get observedAttributes() { return ['lat','lng','img']; }

  constructor(){
    super();
    this.attachShadow({ mode:'open' });
    this._lat = parseFloat(this.getAttribute('lat') || '44.409220');
    this._lng = parseFloat(this.getAttribute('lng') || '8.924081');
    this._img = this.getAttribute('img') || '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --radius: 18px;
          --shadow: 0 10px 30px rgba(2,6,23,.12), 0 2px 8px rgba(2,6,23,.08);
          --mini-size: 120px;
          display:block;
          position:relative;
          width:500px;
          height:300px;
          font-family: system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .card {
          position:absolute;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow:hidden;
          background:#fff;
          transition: transform .6s ease, width .6s ease, height .6s ease, box-shadow .6s ease;
          border: 3px solid #fff;
          outline: none;
        }
        .card, .card * {
          -webkit-tap-highlight-color: transparent;
        }
        .card *:focus { outline: none; }

        .main {
          width:100%; height:100%;
          top:0; left:0;
          transform: translate(0,0) rotate(0deg);
          z-index:1;
          display:flex;
          flex-direction:column;
          justify-content:flex-end;
        }
        .mini {
          width: var(--mini-size);
          height: var(--mini-size);
          transform: translate(380px,185px) rotate(8deg);
          z-index:2;
          cursor:pointer;
          border: 3px solid #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,.28);
          pointer-events: auto;
        }

        .map {
          position:absolute;
          inset:0;
          background-size:cover;
          background-position:center;
        }
        .main .pin-overlay {
          position:absolute;
          top:50%; left:50%;
          width:32px; height:32px;
          transform:translate(-50%,-100%);
          background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="red" viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/></svg>') center/contain no-repeat;
          pointer-events:none;
        }
        .mini .map,
        .mini .button-container { display:none; }
        .mini::after{
          content:"";
          position:absolute;
          top:50%; left:50%;
          width:26px; height:26px;
          transform:translate(-50%,-60%);
          background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="red" viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/></svg>') center/contain no-repeat;
          pointer-events:none;
        }

        ::slotted(img) {
          width:100%; height:100%;
          object-fit:cover;
          display:block;
        }

        .button-container{
          position:absolute;
          left:0; right:0; bottom:0;
          padding: 12px;
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events:auto;
        }
        ds-button { width:100%; }
        ds-button::part(button){
          width:100%;
          background:#000 !important;
          color:#fff !important;
          border-color:#000 !important;
        }
      </style>

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
    `;
  }

  connectedCallback(){
    this._updateMap();

    this.shadowRoot.querySelectorAll('.card').forEach(c => {
      c.addEventListener('click', (e)=>{
        const el = e.currentTarget;
        if (el.classList.contains('mini')) {
          e.stopPropagation();
          this._swap();
        }
      });
    });

    const btn = this.shadowRoot.querySelector('ds-button');
    if (btn) {
      btn.addEventListener('ds-select', (e) => {
        e.stopPropagation();
        this._onRouteClick();
      });
    }
  }

  attributeChangedCallback(name, _, val){
    if(name==='lat') this._lat = parseFloat(val);
    if(name==='lng') this._lng = parseFloat(val);
    if(name==='img') this._img = val || '';
    this._updateMap();
  }

  _updateMap(){
    const map = this.shadowRoot.querySelector('.map');
    if(!map) return;

    if (this._img) {
      // Usa immagine personalizzata
      map.style.backgroundImage = `url("${this._img}")`;
    } else {
      // Fallback: mappa statica di Google
      map.style.backgroundImage =
        `url("https://maps.googleapis.com/maps/api/staticmap?center=${this._lat},${this._lng}&zoom=15&size=500x300&markers=color:red%7C${this._lat},${this._lng}")`;
    }
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
