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

export function makePopupContent(node: Node): string {
  const { googleCalUrl, icsContent } = calendarLinks(node);
  const mapsQuery = node.address
    ? `${node.venue}, ${node.address}`
    : `${node.venue}, ${node.city}, ${node.country}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
  const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return `
    <div class="popup-content">
      <h3 class="popup-name">${escapeHtml(node.name)}</h3>
      <p class="popup-date">${escapeHtml(formatDate(node.date))}</p>
      <p class="popup-venue">
        <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(node.venue)}, ${escapeHtml(node.city)}, ${escapeHtml(node.country)}
        </a>
      </p>
      <p class="popup-description">${escapeHtml(node.description)}</p>
      <div class="popup-actions">
        <button class="read-more" data-node-id="${escapeHtml(node.id)}">Read more</button>
        <a href="${escapeHtml(node.website)}" target="_blank" rel="noopener noreferrer" class="popup-link">Website</a>
        <a href="${escapeHtml(googleCalUrl)}" target="_blank" rel="noopener noreferrer" class="popup-link">Add to Google Calendar</a>
        <a href="${icsDataUri}" download="${escapeHtml(node.id)}.ics" class="popup-link">Download .ics</a>
        <a href="mailto:${escapeHtml(node.organizer_email)}" class="popup-link">Contact organizer</a>
      </div>
    </div>
  `.trim();
}
