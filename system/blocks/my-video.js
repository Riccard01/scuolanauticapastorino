class MyVideo extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  _render() {
    const videoSrc = this.getAttribute('src') || '';
    const title    = this.getAttribute('title') || 'Titolo di esempio';
    const subtitle = this.getAttribute('subtitle') || 'Sottotitolo di esempio';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        .container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          overflow: hidden;
        }

        video {
          width: 100%;
          height: auto;
          max-height: 500px;
          object-fit: cover;
        }

        .overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 1rem;
          background: rgba(0,0,0,0.25);
        }

        /* Mobile: video 9/16 */
        @media (max-width: 768px) {
          video {
            width: 100%;
            height: auto;
            max-height: none;
          }

          .cta-buttons {
            flex-direction: column;
          }
        }

        /* Desktop: altezza fissa 500px */
        @media (min-width: 769px) {
          video {
            height: 500px;
            width: auto;
            min-width: 100%;
          }

          .cta-buttons {
            flex-direction: row;
          }
        }

        .cta {
          margin-top: 1rem;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }

        /* freccia animata */
        .arrow {
          margin-top: 1.5rem;
          width: 32px;
          height: 32px;
          color: white;
          animation: bounce 1.5s infinite;
          cursor: pointer;
        }

        .arrow svg {
          width: 100%;
          height: 100%;
          fill: white;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(8px);
          }
          60% {
            transform: translateY(4px);
          }
        }
      </style>

      <div class="container">
        <video autoplay muted loop playsinline>
          <source src="${videoSrc}" type="video/mp4">
        </video>

        <div class="overlay">
          <my-title 
            title="${title}" 
            subtitle="${subtitle}" 
            style="--my-title-color: white; --my-subtitle-color: white;">
          </my-title>

          <div class="cta">
            <div class="cta-buttons">
              <ds-button variant="overlay" size="lg" id="cta-btn-programma">
                <span slot="text">Scopri il programma</span>
              </ds-button>
              <ds-button variant="overlay" size="lg" id="cta-btn-disponibilita">
                <span slot="text">Vedi disponibilità</span>
              </ds-button>
            </div>
          </div>

          <div class="arrow" id="cta-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 16.5c-.26 0-.52-.1-.71-.29l-6-6a1.003 1.003 0 011.42-1.42L12 14.09l5.29-5.3a1.003 1.003 0 011.42 1.42l-6 6c-.19.19-.45.29-.71.29z"/>
            </svg>
          </div>
        </div>
      </div>
    `;

    this._attachEvents();
  }

  _attachEvents() {
    const btnProgramma = this.shadowRoot.querySelector('#cta-btn-programma');
    const btnDisponibilita = this.shadowRoot.querySelector('#cta-btn-disponibilita');
    const arrow = this.shadowRoot.querySelector('#cta-arrow');

    const scrollToFleet = () => {
      const target = document.querySelector('#la-nostra-flotta');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToWhatsapp = () => {
      const target = document.querySelector('#whatsapp');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    };

    if (btnProgramma) {
      btnProgramma.addEventListener('ds-select', scrollToFleet);
    }
    if (btnDisponibilita) {
      btnDisponibilita.addEventListener('ds-select', scrollToWhatsapp);
    }
    if (arrow) {
      arrow.addEventListener('click', scrollToFleet);
    }
  }
}

customElements.define('my-video', MyVideo);
