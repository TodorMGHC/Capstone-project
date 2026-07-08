import './footer.css';

export function createFooter() {
  const currentYear = new Date().getFullYear();

  return `
    <footer class="site-footer">
      <div class="container-xxl site-footer__inner d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <span>Burnt out Lamps Map for Bulgaria.</span>
        <span>Built with Vite, Supabase, Leaflet, HTML, CSS, JavaScript, and Bootstrap. © ${currentYear}</span>
      </div>
    </footer>
  `;
}
