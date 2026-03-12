import { getCollection } from 'astro:content';
import { OpenLocationCode } from 'open-location-code';
import nodesData from '../data/nodes.json';

export interface Node {
  // Identity
  id: string;
  name: string;

  // Location
  city: string;
  country: string;
  region: string;
  venue: string;
  address?: string;
  location_tbd?: boolean;
  plus_code: string;
  lat: number;
  lng: number;

  // Event
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  date_tbd?: boolean;
  time_tbd?: boolean;
  online?: boolean;
  online_url?: string;
  website: string;
  short_description: string;
  long_description?: string;
  details_markdown: string;
  details_text: string;
  event_page_path?: string;
  tags: string[];
  organizers: { name: string; email: string }[];
  organizing_entity?: string;
  contact_email: string;
  submitter_email?: string;
  forum_url?: string;
  confirmed: boolean;
  placeholder?: boolean;
  maintainer?: { name: string; email: string };
}

interface NodeInput {
  id: string;
  name: string;
  city: string;
  country: string;
  region: string;
  venue: string;
  address?: string;
  plus_code: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  date_tbd?: boolean;
  time_tbd?: boolean;
  online?: boolean;
  online_url?: string;
  website: string;
  short_description: string;
  long_description?: string;
  tags: string[];
  organizers: { name: string; email: string }[];
  organizing_entity?: string;
  contact_email: string;
  submitter_email?: string;
  forum_url?: string;
  confirmed: boolean;
  placeholder?: boolean;
  maintainer?: { name: string; email: string };
}

function normalizeOptionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

export async function loadNodes(): Promise<Node[]> {
  const olc = new OpenLocationCode();
  const data = nodesData as unknown as { nodes: NodeInput[] };
  const eventEntries = await getCollection('events');
  const eventMap = new Map(eventEntries.map((entry) => [entry.data.id, entry]));

  return data.nodes.map((input) => {
    if (!olc.isValid(input.plus_code) || !olc.isFull(input.plus_code)) {
      throw new Error(
        `[nodes] Invalid or short plus_code for "${input.id}": "${input.plus_code}".\n` +
        `All plus codes must be full global codes. Look up the full code at https://plus.codes`
      );
    }

    const decoded = olc.decode(input.plus_code);
    const venue = input.venue.trim();
    const address = normalizeOptionalText(input.address);
    const start_date = normalizeOptionalText(input.start_date);
    const end_date = normalizeOptionalText(input.end_date);
    const start_time = normalizeOptionalText(input.start_time);
    const end_time = normalizeOptionalText(input.end_time);
    const location_tbd = !input.online && !venue && !address;
    const eventEntry = eventMap.get(input.id);
    const details_markdown = normalizeOptionalText(eventEntry?.body) ?? normalizeOptionalText(input.long_description) ?? '';
    const details_text = markdownToText(details_markdown);

    return {
      ...input,
      venue,
      address,
      start_date,
      end_date,
      start_time,
      end_time,
      date_tbd: !start_date,
      time_tbd: !!start_date && !start_time,
      location_tbd,
      details_markdown,
      details_text,
      event_page_path: eventEntry ? `${import.meta.env.BASE_URL}events/${eventEntry.slug}/` : undefined,
      lat: decoded.latitudeCenter,
      lng: decoded.longitudeCenter,
    };
  });
}
