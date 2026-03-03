import type { Node } from './nodes';
import { formatDate, calendarLinks } from './format';

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ICON_PIN = `<svg class="popup-icon" width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5zm0 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>`;
const ICON_GLOBE = `<svg class="popup-icon" width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm4.93 6H11.5c-.1-1.4-.45-2.66-.97-3.65A5.51 5.51 0 0 1 12.93 7zM8 2.1c.7.9 1.22 2.24 1.46 3.9H6.54C6.78 4.34 7.3 3 8 2.1zM2.5 9h1.43c.1 1.4.45 2.66.97 3.65A5.51 5.51 0 0 1 2.5 9zm1.57-2h-1.5a5.51 5.51 0 0 1 2.46-3.65C4.51 4.34 4.16 5.6 4.07 7zm1.47 0c.24-1.56.76-2.9 1.46-3.9C7.7 4.1 8.22 5.44 8.46 7H5.54zm0 2h2.92c-.24 1.56-.76 2.9-1.46 3.9-.7-1-1.22-2.34-1.46-3.9zm3.46 3.65c.52-.99.87-2.25.97-3.65h1.43a5.51 5.51 0 0 1-2.4 3.65zm1-5.65c-.1-1.4-.45-2.66-.97-3.65A5.51 5.51 0 0 1 11.93 7h-1.43z"/></svg>`;
const ICON_CALENDAR = `<svg class="popup-icon" width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11 1v1H5V1H4v1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-2V1h-1zm2 4H3V3h1v1h1V3h6v1h1V3h1v2zm0 2v7H3V7h10z"/></svg>`;
const ICON_EMAIL = `<svg class="popup-icon" width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3zm1 .5V4l6 3.75L14 4v-.5H2zm0 2.06V13h12V5.56L8 9.25 2 5.56z"/></svg>`;

export function makePopupContent(node: Node): string {
  const { googleCalUrl, icsContent } = calendarLinks(node);
  const osmQuery = node.address
    ? `${node.venue}, ${node.address}`
    : `${node.venue}, ${node.city}, ${node.country}`;
  const osmUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(osmQuery)}`;
  const venueText = node.address
    ? `${node.venue}, ${node.address}`
    : `${node.venue}, ${node.city}, ${node.country}`;
  const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  const date = escapeHtml(formatDate(node.date));
  const location = escapeHtml(`${node.city}, ${node.country}`);
  const descriptionParagraphs = node.description
    .split(/\n\n+/)
    .filter(Boolean)
    .map(p => `<p class="popup-description">${escapeHtml(p)}</p>`)
    .join('');

  const placeholderBanner = node.placeholder
    ? `<div class="popup-placeholder">&#9888; This is placeholder data. No real event has been confirmed at this location.</div>`
    : '';

  return `
    <div class="popup-content">
      ${placeholderBanner}
      <h3 class="popup-name">${escapeHtml(node.name)}</h3>
      <p class="popup-date"><strong>${date} &middot; ${location}</strong></p>
      <p class="popup-venue">
        ${ICON_PIN}<a href="${escapeHtml(osmUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(venueText)}</a>
      </p>
      <div class="popup-actions">
        <div class="popup-link-row">
          ${ICON_GLOBE}<a href="${escapeHtml(node.website)}" target="_blank" rel="noopener noreferrer" class="popup-link">Visit event website</a>
        </div>
        <div class="popup-link-row popup-link-row--cal">
          ${ICON_CALENDAR}<a href="${escapeHtml(googleCalUrl)}" target="_blank" rel="noopener noreferrer" class="popup-link">Google Calendar</a>
          <span class="popup-link-sep" aria-hidden="true">&middot;</span>
          ${ICON_CALENDAR}<a href="${icsDataUri}" download="${escapeHtml(node.id)}.ics" class="popup-link">Download .ics</a>
        </div>
        <div class="popup-link-row">
          ${ICON_EMAIL}<a href="mailto:${escapeHtml(node.organizer_email)}" class="popup-link">${escapeHtml(node.organizer_email)}</a>
        </div>
      </div>
      <div class="popup-body">
        ${descriptionParagraphs}
        <button class="read-more" data-node-id="${escapeHtml(node.id)}">Read more &rarr;</button>
      </div>
    </div>
  `.trim();
}
