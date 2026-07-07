import './footer.css';

export function createFooter() {
  const currentYear = new Date().getFullYear();

  return `
    <footer class="site-footer">
      <div class="container-xl site-footer__inner">
        <div class="site-footer__meta">
          <span class="site-footer__brand">Capstone Project</span>
          <span>Built with Vite, JavaScript, HTML, CSS, and Bootstrap. © ${currentYear}</span>
        </div>
      </div>
    </footer>
  `;
}
