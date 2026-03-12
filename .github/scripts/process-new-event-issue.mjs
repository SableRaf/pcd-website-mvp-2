import fs from 'node:fs/promises';
import path from 'node:path';

const WORKSPACE = process.cwd();
const RUNNER_TEMP = process.env.RUNNER_TEMP ?? path.join(WORKSPACE, '.tmp');
const OUTPUT_PATH = process.env.GITHUB_OUTPUT;
const EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const YEAR = '2026';

await fs.mkdir(RUNNER_TEMP, { recursive: true });

const eventPayload = JSON.parse(await fs.readFile(EVENT_PATH, 'utf8'));
const issue = eventPayload.issue;
const issueNumber = issue.number;
const issueBody = issue.body ?? '';

async function setOutput(key, value) {
  if (!OUTPUT_PATH) return;
  await fs.appendFile(OUTPUT_PATH, `${key}=${String(value)}\n`);
}

function parseIssueSections(body) {
  const normalized = body.replace(/\r/g, '');
  const matches = [...normalized.matchAll(/^### (.+)\n([\s\S]*?)(?=^### |\s*$)/gm)];
  return new Map(matches.map(([, label, value]) => {
    const cleaned = value.trim().replace(/^_No response_\s*$/m, '').trim();
    return [label.trim(), cleaned];
  }));
}

function required(fields, label, errors) {
  const value = fields.get(label)?.trim() ?? '';
  if (!value) errors.push(`${label} is required.`);
  return value;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function isValidTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidPlusCode(value) {
  const normalized = value.replace(/\s+/g, '').toUpperCase();
  return /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2,3}$/.test(normalized);
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function parseTags(raw) {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseOrganizers(raw, errors) {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    errors.push('Organizers must include at least one person.');
    return [];
  }

  return lines.map((line) => {
    const match = line.match(/^(.*?)\s*<([^>]+)>$/);
    if (!match) return { name: line, email: '' };
    const [, name, email] = match;
    if (email && !isValidEmail(email.trim())) {
      errors.push(`Organizer email "${email.trim()}" is not valid.`);
    }
    return { name: name.trim(), email: email.trim() };
  }).filter((organizer) => organizer.name);
}

function toYamlScalar(value) {
  return JSON.stringify(value ?? '');
}

function toYamlList(values, indent = 0) {
  const prefix = ' '.repeat(indent);
  return values.map((value) => `${prefix}- ${toYamlScalar(value)}`).join('\n');
}

function toYamlOrganizerList(values, indent = 0) {
  const prefix = ' '.repeat(indent);
  return values.map((value) => [
    `${prefix}- name: ${toYamlScalar(value.name)}`,
    `${prefix}  email: ${toYamlScalar(value.email)}`,
  ].join('\n')).join('\n');
}

function buildValidationComment(errors) {
  return [
    'Thanks for submitting a new event. I could not generate the branch and pull request yet because a few fields need attention:',
    '',
    ...errors.map((error) => `- ${error}`),
    '',
    'Please edit the issue with the missing or corrected information. Opening a fresh submission is also fine if that is easier.',
  ].join('\n');
}

function buildPrBody(number, name) {
  return [
    `Closes #${number}`,
    '',
    `This PR was generated from the "New Event" issue form for **${name}**.`,
    '',
    'Review checklist:',
    '- [ ] Dates, times, and timezone are correct',
    '- [ ] Venue, address, plus code, or online URL are correct',
    '- [ ] Public contact info and maintainer contact info are correct',
    '- [ ] Short description and full event description are ready to publish',
    '- [ ] The event should be listed on the map in its current confirmed state',
  ].join('\n');
}

if (!issueBody.includes('<!-- new-event-template -->')) {
  await setOutput('valid', 'false');
  const noopCommentPath = path.join(RUNNER_TEMP, `new-event-${issueNumber}-noop.md`);
  await fs.writeFile(noopCommentPath, 'Issue does not use the New Event template.');
  await setOutput('validation_comment_path', noopCommentPath);
  process.exit(0);
}

const fields = parseIssueSections(issueBody);
const errors = [];

const eventName = required(fields, 'Event name', errors);
const city = required(fields, 'City', errors);
const country = required(fields, 'Country', errors);
const region = required(fields, 'Region', errors);
const eventFormat = required(fields, 'Event format', errors);
const venue = required(fields, 'Venue or platform name', errors);
const address = fields.get('Street address')?.trim() ?? '';
const plusCode = required(fields, 'Full global plus code', errors).replace(/\s+/g, '').toUpperCase();
const startDate = required(fields, 'Start date', errors);
const endDate = required(fields, 'End date', errors);
const startTime = required(fields, 'Start time', errors);
const endTime = required(fields, 'End time', errors);
const timezone = required(fields, 'Timezone abbreviation', errors);
const website = required(fields, 'Event website', errors);
const contactEmail = required(fields, 'Primary contact email', errors);
const organizingEntity = required(fields, 'Organizing entity', errors);
const organizers = parseOrganizers(required(fields, 'Organizers', errors), errors);
const shortDescription = required(fields, 'Short description', errors);
const fullDescription = required(fields, 'Full event description', errors);
const onlineUrl = fields.get('Online event URL')?.trim() ?? '';
const forumUrl = fields.get('Forum discussion URL')?.trim() ?? '';
const tags = parseTags(fields.get('Tags')?.trim() ?? '');
const confirmed = required(fields, 'Is this event already confirmed?', errors);
const maintainerName = required(fields, 'Maintainer name', errors);
const maintainerEmail = required(fields, 'Maintainer email', errors);
const maintainerNotes = fields.get('Additional notes for maintainers')?.trim() ?? '';

if (startDate && !isValidDate(startDate)) errors.push(`Start date must use YYYY-MM-DD and be a real date. Received "${startDate}".`);
if (endDate && !isValidDate(endDate)) errors.push(`End date must use YYYY-MM-DD and be a real date. Received "${endDate}".`);
if (isValidDate(startDate) && isValidDate(endDate) && endDate < startDate) errors.push('End date cannot be earlier than start date.');
if (startTime && !isValidTime(startTime)) errors.push(`Start time must use 24-hour HH:MM. Received "${startTime}".`);
if (endTime && !isValidTime(endTime)) errors.push(`End time must use 24-hour HH:MM. Received "${endTime}".`);
if (startTime && endTime && isValidTime(startTime) && isValidTime(endTime) && endTime <= startTime) errors.push('End time must be later than start time.');
if (website && !isValidHttpUrl(website)) errors.push(`Event website must be a valid http or https URL. Received "${website}".`);
if (forumUrl && !isValidHttpUrl(forumUrl)) errors.push(`Forum discussion URL must be a valid http or https URL. Received "${forumUrl}".`);
if (contactEmail && !isValidEmail(contactEmail)) errors.push(`Primary contact email is not valid. Received "${contactEmail}".`);
if (maintainerEmail && !isValidEmail(maintainerEmail)) errors.push(`Maintainer email is not valid. Received "${maintainerEmail}".`);
if (plusCode && !isValidPlusCode(plusCode)) errors.push(`Full global plus code is not valid. Received "${plusCode}".`);
if (eventFormat === 'Online' && !onlineUrl) errors.push('Online event URL is required for online events.');
if (onlineUrl && !isValidHttpUrl(onlineUrl)) errors.push(`Online event URL must be a valid http or https URL. Received "${onlineUrl}".`);
if (!['Yes', 'No'].includes(confirmed)) errors.push('Is this event already confirmed? must be Yes or No.');
if (!['In person', 'Online'].includes(eventFormat)) errors.push('Event format must be In person or Online.');

const idSource = eventFormat === 'Online' && region === 'Global'
  ? `${eventName}-${YEAR}`
  : `${city || eventName}-${YEAR}`;
const eventId = slugify(idSource.startsWith('pcd-') ? idSource : `pcd-${idSource}`);

const nodesJsonPath = path.join(WORKSPACE, 'pcd-website/src/data/nodes.json');
const markdownPath = path.join(WORKSPACE, 'pcd-website/src/content/events', `${eventId}.md`);
const nodesData = JSON.parse(await fs.readFile(nodesJsonPath, 'utf8'));

if (nodesData.nodes.some((node) => node.id === eventId)) {
  errors.push(`An event with the generated id "${eventId}" already exists. Update the existing event instead of creating a duplicate.`);
}

if (errors.length > 0) {
  const validationCommentPath = path.join(RUNNER_TEMP, `new-event-${issueNumber}-validation.md`);
  await fs.writeFile(validationCommentPath, buildValidationComment(errors));
  await setOutput('valid', 'false');
  await setOutput('validation_comment_path', validationCommentPath);
  process.exit(0);
}

const nodeRecord = {
  id: eventId,
  name: eventName,
  city,
  country,
  region,
  venue,
  address,
  start_date: startDate,
  end_date: endDate,
  start_time: startTime,
  end_time: endTime,
  timezone,
  ...(eventFormat === 'Online' ? { online: true, online_url: onlineUrl } : {}),
  plus_code: plusCode,
  website,
  short_description: shortDescription,
  tags,
  organizers,
  organizing_entity: organizingEntity,
  contact_email: contactEmail,
  forum_url: forumUrl,
  confirmed: confirmed === 'Yes',
  placeholder: false,
  maintainer: {
    name: maintainerName,
    email: maintainerEmail,
  },
};

nodesData.nodes.push(nodeRecord);
nodesData.nodes.sort((a, b) => {
  const byDate = (a.start_date ?? '').localeCompare(b.start_date ?? '');
  if (byDate !== 0) return byDate;
  return a.name.localeCompare(b.name);
});

const markdownLines = [
  '---',
  `id: ${eventId}`,
  `title: ${toYamlScalar(eventName)}`,
  `city: ${toYamlScalar(city)}`,
  `country: ${toYamlScalar(country)}`,
  `region: ${toYamlScalar(region)}`,
  `venue: ${toYamlScalar(venue)}`,
  `address: ${toYamlScalar(address)}`,
  `start_date: ${toYamlScalar(startDate)}`,
  `end_date: ${toYamlScalar(endDate)}`,
  `start_time: ${toYamlScalar(startTime)}`,
  `end_time: ${toYamlScalar(endTime)}`,
  `timezone: ${toYamlScalar(timezone)}`,
  `plus_code: ${toYamlScalar(plusCode)}`,
  `website: ${toYamlScalar(website)}`,
  `short_description: ${toYamlScalar(shortDescription)}`,
  `organizing_entity: ${toYamlScalar(organizingEntity)}`,
  'organizers:',
  toYamlOrganizerList(organizers, 2),
  `contact_email: ${toYamlScalar(contactEmail)}`,
  `forum_url: ${toYamlScalar(forumUrl)}`,
  `confirmed: ${confirmed === 'Yes'}`,
  `online: ${eventFormat === 'Online'}`,
  `online_url: ${toYamlScalar(onlineUrl)}`,
  ...(tags.length ? ['tags:', toYamlList(tags, 2)] : ['tags: []']),
  'maintainer:',
  `  name: ${toYamlScalar(maintainerName)}`,
  `  email: ${toYamlScalar(maintainerEmail)}`,
  `issue_number: ${issueNumber}`,
  `maintainer_notes: ${toYamlScalar(maintainerNotes)}`,
  '---',
  '',
  fullDescription.trim(),
  '',
];

await fs.writeFile(nodesJsonPath, `${JSON.stringify(nodesData, null, 2)}\n`);
await fs.writeFile(markdownPath, markdownLines.join('\n'));

const prBodyPath = path.join(RUNNER_TEMP, `new-event-${issueNumber}-pr-body.md`);
await fs.writeFile(prBodyPath, buildPrBody(issueNumber, eventName));

await setOutput('valid', 'true');
await setOutput('branch', `automation/new-event-${issueNumber}-${eventId}`);
await setOutput('commit_message', `Add ${eventName} event from issue #${issueNumber}`);
await setOutput('pr_title', `Add ${eventName} to the PCD map`);
await setOutput('pr_body_path', prBodyPath);
