export function iconSvg(path, viewBox = '0 0 24 24') {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${path}
    </svg>
  `;
}

export const LampIcon = () => iconSvg('<path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a5 5 0 0 0-3 9v3h6V11a5 5 0 0 0-3-9Z" />');
export const MapPinIcon = () => iconSvg('<path d="M12 21s6-4.9 6-10a6 6 0 1 0-12 0c0 5.1 6 10 6 10Z" /><circle cx="12" cy="11" r="2.2" />');
export const PlusIcon = () => iconSvg('<path d="M12 5v14" /><path d="M5 12h14" />');
export const PencilIcon = () => iconSvg('<path d="M15.5 5.5 18.5 8.5" /><path d="M4 20h4l10-10a2.1 2.1 0 0 0-4-4L4 16v4Z" />');
export const TrashIcon = () => iconSvg('<path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" />');
export const LogInIcon = () => iconSvg('<path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 4v16" />');
export const LogOutIcon = () => iconSvg('<path d="M14 17l5-5-5-5" /><path d="M19 12H7" /><path d="M7 4H4v16h3" />');
