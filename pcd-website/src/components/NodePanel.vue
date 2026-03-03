<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { createFocusTrap, type FocusTrap } from 'focus-trap';
import type { Node } from '../lib/nodes';
import { formatDate, calendarLinks } from '../lib/format';

const props = defineProps<{
  node: Node | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const panelRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
let trap: FocusTrap | null = null;

onMounted(() => {
  if (panelRef.value) {
    trap = createFocusTrap(panelRef.value, {
      initialFocus: () => closeButtonRef.value ?? panelRef.value!,
      onDeactivate: () => emit('close'),
      returnFocusOnDeactivate: false,
      escapeDeactivates: true,
      allowOutsideClick: true,
      fallbackFocus: () => panelRef.value!,
    });
  }
});

onUnmounted(() => {
  trap?.deactivate();
});

watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      trap?.activate();
    } else {
      trap?.deactivate();
      document.getElementById('map')?.focus();
    }
  }
);

function downloadIcs(node: Node) {
  const { icsContent } = calendarLinks(node);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${node.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getOsmUrl(node: Node): string {
  const query = node.address
    ? `${node.venue}, ${node.address}`
    : `${node.venue}, ${node.city}, ${node.country}`;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

function getVenueText(node: Node): string {
  return node.address
    ? `${node.venue}, ${node.address}`
    : `${node.venue}, ${node.city}, ${node.country}`;
}

function getParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(Boolean);
}
</script>

<template>
  <aside
    ref="panelRef"
    role="dialog"
    aria-modal="true"
    aria-labelledby="panel-title"
    tabindex="-1"
    :class="['node-panel', { 'node-panel--open': node !== null }]"
  >
    <button
      ref="closeButtonRef"
      class="panel-close"
      aria-label="Close event details"
      @click="emit('close')"
    >
      ×
    </button>

    <template v-if="node">
      <div class="panel-content">
        <div v-if="node.placeholder" class="panel-placeholder">
          ⚠ This is placeholder data. No real event has been confirmed at this location.
        </div>

        <h2 id="panel-title" class="panel-name">{{ node.name }}</h2>
        <p class="panel-meta">{{ formatDate(node.date) }}</p>

        <p class="panel-venue">
          <svg class="panel-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5zm0 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
          <a :href="getOsmUrl(node)" target="_blank" rel="noopener noreferrer">{{ getVenueText(node) }}</a>
        </p>

        <div class="panel-description">
          <p
            v-for="(para, i) in getParagraphs(node.long_description ?? node.description)"
            :key="i"
          >{{ para }}</p>
        </div>

        <div class="panel-links">
          <div class="panel-link-row">
            <svg class="panel-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm4.93 6H11.5c-.1-1.4-.45-2.66-.97-3.65A5.51 5.51 0 0 1 12.93 7zM8 2.1c.7.9 1.22 2.24 1.46 3.9H6.54C6.78 4.34 7.3 3 8 2.1zM2.5 9h1.43c.1 1.4.45 2.66.97 3.65A5.51 5.51 0 0 1 2.5 9zm1.57-2h-1.5a5.51 5.51 0 0 1 2.46-3.65C4.51 4.34 4.16 5.6 4.07 7zm1.47 0c.24-1.56.76-2.9 1.46-3.9C7.7 4.1 8.22 5.44 8.46 7H5.54zm0 2h2.92c-.24 1.56-.76 2.9-1.46 3.9-.7-1-1.22-2.34-1.46-3.9zm3.46 3.65c.52-.99.87-2.25.97-3.65h1.43a5.51 5.51 0 0 1-2.4 3.65zm1-5.65c-.1-1.4-.45-2.66-.97-3.65A5.51 5.51 0 0 1 11.93 7h-1.43z"/></svg>
            <a :href="node.website" target="_blank" rel="noopener noreferrer" class="panel-link">Visit event website</a>
          </div>

          <div class="panel-link-row panel-link-row--cal">
            <svg class="panel-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11 1v1H5V1H4v1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-2V1h-1zm2 4H3V3h1v1h1V3h6v1h1V3h1v2zm0 2v7H3V7h10z"/></svg>
            <a
              :href="calendarLinks(node).googleCalUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="panel-link"
            >Google Calendar</a>
            <span class="panel-link-sep" aria-hidden="true">&middot;</span>
            <svg class="panel-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11 1v1H5V1H4v1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-2V1h-1zm2 4H3V3h1v1h1V3h6v1h1V3h1v2zm0 2v7H3V7h10z"/></svg>
            <button class="panel-link panel-link--btn" @click="downloadIcs(node)">Download .ics</button>
          </div>

          <div class="panel-link-row">
            <svg class="panel-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3zm1 .5V4l6 3.75L14 4v-.5H2zm0 2.06V13h12V5.56L8 9.25 2 5.56z"/></svg>
            <a :href="`mailto:${node.organizer_email}`" class="panel-link">{{ node.organizer_email }}</a>
          </div>
        </div>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.node-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: clamp(320px, 40vw, 520px);
  background: var(--color-bg-panel);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: var(--z-panel);
  transform: translateX(100%);
  transition: var(--transition-panel);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.node-panel--open {
  transform: translateX(0);
}

@media (max-width: 720px) {
  .node-panel {
    width: 100vw;
  }
}

.panel-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  padding: 0;
}

.panel-close:hover {
  background: #f5f5f5;
}

.panel-content {
  padding: 3rem 1.5rem 2rem;
}

.panel-placeholder {
  background: #fffbea;
  border: 1px solid #e8b84b;
  border-radius: 4px;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  line-height: 1.45;
  margin-bottom: 1rem;
  color: #6b4c00;
}

.panel-name {
  margin: 0 0 0.375rem;
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1.3;
  padding-right: 2.5rem;
}

.panel-meta {
  margin: 0 0 0.625rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.panel-venue {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  margin: 0 0 1.25rem;
  font-size: 0.9375rem;
}

.panel-icon {
  flex-shrink: 0;
  margin-top: 0.15em;
  color: var(--color-text-muted);
}

.panel-venue a {
  color: var(--color-text);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
}

.panel-venue a:hover {
  text-decoration-style: solid;
}

.panel-description {
  margin-bottom: 1.5rem;
}

.panel-description p {
  margin: 0 0 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.6;
}

.panel-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
}

.panel-link-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.panel-link-sep {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.panel-link {
  color: var(--color-focus);
  font-size: 0.9375rem;
  text-decoration: none;
}

.panel-link:hover {
  text-decoration: underline;
}

.panel-link--btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: 0.9375rem;
  text-align: left;
}
</style>
