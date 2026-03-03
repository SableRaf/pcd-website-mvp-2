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

function getMapsUrl(node: Node): string {
  const query = node.address
    ? `${node.venue}, ${node.address}`
    : `${node.venue}, ${node.city}, ${node.country}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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
        <h2 id="panel-title" class="panel-name">{{ node.name }}</h2>
        <p class="panel-meta">
          {{ formatDate(node.date) }} &mdash; {{ node.city }}, {{ node.country }}
        </p>
        <p class="panel-venue">
          <a :href="getMapsUrl(node)" target="_blank" rel="noopener noreferrer">
            {{ node.venue }}
            <template v-if="node.address">, {{ node.address }}</template>
          </a>
        </p>

        <div class="panel-description">
          <p
            v-for="(para, i) in getParagraphs(node.long_description ?? node.description)"
            :key="i"
          >{{ para }}</p>
        </div>

        <div class="panel-links">
          <a
            :href="node.website"
            target="_blank"
            rel="noopener noreferrer"
            class="panel-link"
          >Visit website</a>

          <a
            :href="calendarLinks(node).googleCalUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="panel-link"
          >Add to Google Calendar</a>

          <button
            class="panel-link panel-link--btn"
            @click="downloadIcs(node)"
          >Download .ics</button>

          <a
            :href="`mailto:${node.organizer_email}`"
            class="panel-link"
          >Contact organizer</a>
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

.panel-name {
  margin: 0 0 0.5rem;
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1.3;
  padding-right: 2.5rem;
}

.panel-meta {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.panel-venue {
  margin: 0 0 1.25rem;
  font-size: 0.9375rem;
}

.panel-venue a {
  color: var(--color-focus);
  text-decoration: none;
}

.panel-venue a:hover {
  text-decoration: underline;
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
  gap: 0.625rem;
}

.panel-link {
  display: inline-block;
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
  text-align: left;
}
</style>
