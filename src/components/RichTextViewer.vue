<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    content: string
    compact?: boolean
  }>(),
  {
    content: '',
    compact: false,
  },
)

const isHtml = computed(() => {
  if (!props.content) return false
  return /<[a-z][\s\S]*>/i.test(props.content)
})
</script>

<template>
  <div v-if="!content" class="text-muted italic text-xs">
    <slot name="empty" />
  </div>
  <div
    v-else-if="isHtml"
    class="rich-text-content"
    :class="{ 'compact-view': compact }"
    v-html="content"
  />
  <div v-else class="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
    {{ content }}
  </div>
</template>

<style>
.rich-text-content {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-ink);
  word-break: break-word;
}

.rich-text-content p {
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.rich-text-content p:first-child {
  margin-top: 0;
}

.rich-text-content p:last-child {
  margin-bottom: 0;
}

.rich-text-content h1 {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
  margin-top: 0.75rem;
  margin-bottom: 0.4rem;
  color: var(--color-ink);
}

.rich-text-content h2 {
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.35;
  margin-top: 0.6rem;
  margin-bottom: 0.35rem;
  color: var(--color-ink);
}

.rich-text-content h3 {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 0.5rem;
  margin-bottom: 0.3rem;
  color: var(--color-ink);
}

.rich-text-content ul {
  list-style-type: disc;
  padding-left: 1.4rem;
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.rich-text-content ol {
  list-style-type: decimal;
  padding-left: 1.4rem;
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.rich-text-content li {
  margin-top: 0.15rem;
  margin-bottom: 0.15rem;
}

.rich-text-content ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.rich-text-content ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.rich-text-content ul[data-type="taskList"] li > label {
  margin-top: 0.2rem;
  user-select: none;
}

.rich-text-content ul[data-type="taskList"] li > label input[type="checkbox"] {
  accent-color: var(--color-accent);
  cursor: default;
}

.rich-text-content blockquote {
  border-left: 3px solid var(--color-accent);
  padding-left: 0.85rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  font-style: italic;
  color: var(--color-muted);
  background: color-mix(in oklab, var(--color-accent) 5%, transparent);
  border-radius: 0 0.375rem 0.375rem 0;
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
}

.rich-text-content pre {
  background: color-mix(in oklab, var(--color-ink) 8%, var(--color-canvas));
  border: 1px solid var(--color-line);
  border-radius: 0.6rem;
  padding: 0.6rem 0.8rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.rich-text-content code {
  background: color-mix(in oklab, var(--color-ink) 8%, var(--color-canvas));
  border-radius: 0.3rem;
  padding: 0.15rem 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
}

.rich-text-content pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
}

.rich-text-content a {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  font-weight: 500;
  transition: opacity 120ms ease;
}

.rich-text-content a:hover {
  opacity: 0.8;
}

.rich-text-content u {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.rich-text-content s {
  text-decoration: line-through;
  opacity: 0.75;
}

.rich-text-content mark {
  border-radius: 0.2rem;
  padding: 0.05rem 0.2rem;
}

.rich-text-content.compact-view {
  font-size: 0.8125rem;
  line-height: 1.5;
}
</style>
