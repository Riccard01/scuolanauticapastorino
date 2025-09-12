
class MyTitle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  _render() {
    const title = this.getAttribute('title') || 'Titolo di esempio';
    const subtitle = this.getAttribute('subtitle') || 'Questa è una descrizione di esempio, personalizzabile tramite attributo.';

    this.shadowRoot.innerHTML = `
      <style>
        .wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          gap: .5rem;
          margin-bottom: 1.5rem;
          margin-top: 1.5rem;
        }

        .title {
          font-size: 1.7rem;
          font-weight: 700;
          text-align: center;
          color: #0f172a;
          margin: 0;
        }
        .subtitle {
          font-size: 1rem;
          color: #475569;
          max-width: 640px;
          text-align: center;
          margin: 0;
        }
      </style>

      <div class="wrapper">
        <h2 class="title">${title}</h2>
        <p class="subtitle">${subtitle}</p>
      </div>
    `;
  }
}

customElements.define('my-title', MyTitle);
