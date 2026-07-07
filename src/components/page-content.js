import './page-content.css';

export function createPageContent({ kicker = '', title, description = '', body = '', aside = '', actions = '' }) {
  return `
    <main class="site-main">
      <section class="page-shell">
        <div class="container-xl">
          <div class="page-panel">
            <div class="page-panel__grid">
              <div class="page-hero">
                ${kicker ? `<span class="page-kicker">${kicker}</span>` : ''}
                <h1 class="page-title">${title}</h1>
                ${description ? `<p class="page-description">${description}</p>` : ''}
                ${actions ? `<div class="page-actions">${actions}</div>` : ''}
              </div>
              <div class="page-content-row">
                <div class="page-content-card">
                  ${body}
                </div>
                ${aside ? `<aside class="page-content-card">${aside}</aside>` : ''}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}
