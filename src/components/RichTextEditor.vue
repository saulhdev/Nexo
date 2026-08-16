<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Extension } from '@tiptap/core'
import { onClickOutside } from '@vueuse/core'
import {
  Bold,
  Check,
  ChevronDown,
  Code,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Palette,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from 'lucide-vue-next'
import { useI18n } from '@/i18n'

// Custom TipTap Extension for Font Size
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontSize) return {}
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) => {
          return chain().setMark('textStyle', { fontSize }).run()
        },
      unsetFontSize:
        () =>
        ({ chain }: any) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
        },
    }
  },
})

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    minHeight?: string
    compact?: boolean
    autoFocus?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: '',
    minHeight: '110px',
    compact: false,
    autoFocus: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
  (e: 'submit'): void
}>()

const { t } = useI18n()

// Active popovers & template refs for click outside
const showHeadingMenu = ref(false)
const showSizeMenu = ref(false)
const showColorMenu = ref(false)
const showHighlightMenu = ref(false)
const showLinkModal = ref(false)
const linkUrl = ref('')

const headingRef = useTemplateRef<HTMLElement>('headingRef')
const sizeRef = useTemplateRef<HTMLElement>('sizeRef')
const colorRef = useTemplateRef<HTMLElement>('colorRef')
const highlightRef = useTemplateRef<HTMLElement>('highlightRef')

onClickOutside(headingRef, () => {
  showHeadingMenu.value = false
})
onClickOutside(sizeRef, () => {
  showSizeMenu.value = false
})
onClickOutside(colorRef, () => {
  showColorMenu.value = false
})
onClickOutside(highlightRef, () => {
  showHighlightMenu.value = false
})

const TEXT_COLORS = [
  { name: 'Default', value: 'inherit', class: 'bg-ink' },
  { name: 'Slate', value: '#475569', class: 'bg-slate-600' },
  { name: 'Red', value: '#e11d48', class: 'bg-rose-600' },
  { name: 'Orange', value: '#ea580c', class: 'bg-orange-600' },
  { name: 'Amber', value: '#d97706', class: 'bg-amber-600' },
  { name: 'Green', value: '#059669', class: 'bg-emerald-600' },
  { name: 'Teal', value: '#0891b2', class: 'bg-cyan-600' },
  { name: 'Blue', value: '#2563eb', class: 'bg-blue-600' },
  { name: 'Indigo', value: '#4f46e5', class: 'bg-indigo-600' },
  { name: 'Purple', value: '#9333ea', class: 'bg-purple-600' },
  { name: 'Pink', value: '#db2777', class: 'bg-pink-600' },
  { name: 'Forest', value: '#1f6b5a', class: 'bg-[#1f6b5a]' },
]

const HIGHLIGHT_COLORS = [
  { name: 'None', value: '', class: 'bg-transparent border border-line' },
  { name: 'Yellow', value: '#fef08a', class: 'bg-yellow-200' },
  { name: 'Green', value: '#bbf7d0', class: 'bg-green-200' },
  { name: 'Blue', value: '#bfdbfe', class: 'bg-blue-200' },
  { name: 'Purple', value: '#e9d5ff', class: 'bg-purple-200' },
  { name: 'Pink', value: '#fbcfe8', class: 'bg-pink-200' },
  { name: 'Orange', value: '#fed7aa', class: 'bg-orange-200' },
]

const FONT_SIZES = [
  { label: '12px (Small)', value: '12px' },
  { label: '14px (Normal)', value: '14px' },
  { label: '16px (Medium)', value: '16px' },
  { label: '18px (Large)', value: '18px' },
  { label: '22px (Huge)', value: '22px' },
]

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
    Placeholder.configure({
      placeholder: props.placeholder || '',
      emptyEditorClass: 'is-editor-empty',
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    FontSize,
  ],
  autofocus: props.autoFocus,
  onUpdate: ({ editor: ed }) => {
    const html = ed.isEmpty ? '' : ed.getHTML()
    emit('update:modelValue', html)
  },
  onBlur: () => {
    emit('blur')
  },
  editorProps: {
    handleKeyDown: (_view, event) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        emit('submit')
        return true
      }
      return false
    },
  },
})

// Sync external modelValue changes
watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return
    const isSame = editor.value.getHTML() === val || (editor.value.isEmpty && !val)
    if (!isSame) {
      editor.value.commands.setContent(val || '', { emitUpdate: false })
    }
  },
)

watch(
  () => props.placeholder,
  (val) => {
    if (!editor.value) return
    const placeholderExtension = editor.value.extensionManager.extensions.find(
      (ext) => ext.name === 'placeholder',
    )
    if (placeholderExtension) {
      placeholderExtension.options.placeholder = val || ''
      editor.value.view.dispatch(editor.value.state.tr)
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function toggleHeading(level: 1 | 2 | 3 | 0) {
  if (!editor.value) return
  if (level === 0) {
    editor.value.chain().focus().setParagraph().run()
  } else {
    editor.value.chain().focus().toggleHeading({ level }).run()
  }
  showHeadingMenu.value = false
}

function setFontSize(size: string) {
  if (!editor.value) return
  if (!size) {
    ;(editor.value.chain().focus() as any).unsetFontSize().run()
  } else {
    ;(editor.value.chain().focus() as any).setFontSize(size).run()
  }
  showSizeMenu.value = false
}

function setTextColor(color: string) {
  if (!editor.value) return
  if (color === 'inherit') {
    editor.value.chain().focus().unsetColor().run()
  } else {
    editor.value.chain().focus().setColor(color).run()
  }
  showColorMenu.value = false
}

function setHighlightColor(color: string) {
  if (!editor.value) return
  if (!color) {
    editor.value.chain().focus().unsetHighlight().run()
  } else {
    editor.value.chain().focus().setHighlight({ color }).run()
  }
  showHighlightMenu.value = false
}

function openLinkPrompt() {
  if (!editor.value) return
  const prevUrl = editor.value.getAttributes('link').href || ''
  linkUrl.value = prevUrl
  showLinkModal.value = true
}

function saveLink() {
  if (!editor.value) return
  if (!linkUrl.value.trim()) {
    editor.value.chain().focus().unsetLink().run()
  } else {
    let finalUrl = linkUrl.value.trim()
    if (!/^https?:\/\//i.test(finalUrl) && !/^mailto:/i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl
    }
    editor.value.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run()
  }
  showLinkModal.value = false
  linkUrl.value = ''
}

function removeLink() {
  if (!editor.value) return
  editor.value.chain().focus().unsetLink().run()
  showLinkModal.value = false
  linkUrl.value = ''
}

function clearFormatting() {
  if (!editor.value) return
  editor.value.chain().focus().unsetAllMarks().clearNodes().run()
  ;(editor.value.chain().focus() as any).unsetFontSize().run()
}

const currentHeadingLabel = computed(() => {
  if (!editor.value) return t('editor.normal')
  if (editor.value.isActive('heading', { level: 1 })) return 'H1'
  if (editor.value.isActive('heading', { level: 2 })) return 'H2'
  if (editor.value.isActive('heading', { level: 3 })) return 'H3'
  return t('editor.normal')
})

function closeAllPopovers() {
  showHeadingMenu.value = false
  showSizeMenu.value = false
  showColorMenu.value = false
  showHighlightMenu.value = false
}
</script>

<template>
  <div
    class="rich-editor-wrapper rounded-xl border border-line bg-canvas transition-colors focus-within:border-accent/80 shadow-xs flex flex-col"
    @click.self="editor?.chain().focus().run()"
  >
    <!-- MONDAY-STYLE FORMATTING TOOLBAR -->
    <div
      class="editor-toolbar relative z-30 flex flex-wrap items-center gap-0.5 border-b border-line bg-surface/95 px-2 py-1.5 rounded-t-xl select-none backdrop-blur-xs text-ink"
      @click.stop
    >
      <!-- HEADINGS SELECTOR -->
      <div ref="headingRef" class="relative">
        <button
          type="button"
          class="toolbar-btn text-xs font-semibold px-2 py-1 gap-1 min-w-[70px] justify-between cursor-pointer"
          :title="t('editor.heading')"
          @click="
            const prev = showHeadingMenu;
            closeAllPopovers();
            showHeadingMenu = !prev;
          "
        >
          <span class="truncate">{{ currentHeadingLabel }}</span>
          <ChevronDown class="size-3 text-muted shrink-0" />
        </button>

        <div
          v-if="showHeadingMenu"
          class="toolbar-dropdown"
        >
          <button
            type="button"
            class="dropdown-item"
            :class="{ active: !editor?.isActive('heading') }"
            @click="toggleHeading(0)"
          >
            <Type class="size-3.5" />
            <span>{{ t('editor.normal') }}</span>
          </button>
          <button
            type="button"
            class="dropdown-item text-base font-bold"
            :class="{ active: editor?.isActive('heading', { level: 1 }) }"
            @click="toggleHeading(1)"
          >
            <Heading1 class="size-4" />
            <span>{{ t('editor.h1') }}</span>
          </button>
          <button
            type="button"
            class="dropdown-item text-sm font-semibold"
            :class="{ active: editor?.isActive('heading', { level: 2 }) }"
            @click="toggleHeading(2)"
          >
            <Heading2 class="size-3.5" />
            <span>{{ t('editor.h2') }}</span>
          </button>
          <button
            type="button"
            class="dropdown-item text-xs font-medium"
            :class="{ active: editor?.isActive('heading', { level: 3 }) }"
            @click="toggleHeading(3)"
          >
            <Heading3 class="size-3.5" />
            <span>{{ t('editor.h3') }}</span>
          </button>
        </div>
      </div>

      <!-- FONT SIZE SELECTOR -->
      <div ref="sizeRef" class="relative">
        <button
          type="button"
          class="toolbar-btn text-xs font-medium px-2 py-1 gap-1 cursor-pointer"
          :title="t('editor.fontSize')"
          @click="
            const prev = showSizeMenu;
            closeAllPopovers();
            showSizeMenu = !prev;
          "
        >
          <span class="text-[11px] font-semibold">Aa</span>
          <ChevronDown class="size-3 text-muted shrink-0" />
        </button>

        <div
          v-if="showSizeMenu"
          class="toolbar-dropdown min-w-[140px]"
        >
          <button
            v-for="size in FONT_SIZES"
            :key="size.value"
            type="button"
            class="dropdown-item text-xs justify-between"
            @click="setFontSize(size.value)"
          >
            <span>{{ size.label }}</span>
          </button>
          <button
            type="button"
            class="dropdown-item text-xs text-muted border-t border-line mt-1 pt-1"
            @click="setFontSize('')"
          >
            <span>{{ t('editor.defaultColor') }}</span>
          </button>
        </div>
      </div>

      <div class="toolbar-divider" />

      <!-- BASIC INLINE STYLES -->
      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('bold') }"
        :title="t('editor.bold')"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Bold class="size-3.5" />
      </button>

      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('italic') }"
        :title="t('editor.italic')"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Italic class="size-3.5" />
      </button>

      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('underline') }"
        :title="t('editor.underline')"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <UnderlineIcon class="size-3.5" />
      </button>

      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('strike') }"
        :title="t('editor.strike')"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <Strikethrough class="size-3.5" />
      </button>

      <div class="toolbar-divider" />

      <!-- COLOR PICKERS -->
      <!-- TEXT COLOR -->
      <div ref="colorRef" class="relative">
        <button
          type="button"
          class="toolbar-btn gap-1 cursor-pointer"
          :title="t('editor.textColor')"
          @click="
            const prev = showColorMenu;
            closeAllPopovers();
            showColorMenu = !prev;
          "
        >
          <Palette class="size-3.5" />
          <span
            class="size-2 rounded-full border border-black/10"
            :style="{ backgroundColor: editor?.getAttributes('textStyle').color || 'var(--color-ink)' }"
          />
        </button>

        <div
          v-if="showColorMenu"
          class="toolbar-dropdown p-2.5 grid grid-cols-4 gap-1.5 w-48"
        >
          <button
            v-for="color in TEXT_COLORS"
            :key="color.value"
            type="button"
            class="size-7 rounded-lg flex items-center justify-center transition hover:scale-110 shadow-2xs border border-line cursor-pointer"
            :class="color.class"
            :title="color.name"
            @click="setTextColor(color.value)"
          >
            <Check
              v-if="editor?.getAttributes('textStyle').color === color.value || (color.value === 'inherit' && !editor?.getAttributes('textStyle').color)"
              class="size-3 text-white drop-shadow"
            />
          </button>
        </div>
      </div>

      <!-- HIGHLIGHT / BACKGROUND COLOR -->
      <div ref="highlightRef" class="relative">
        <button
          type="button"
          class="toolbar-btn gap-1 cursor-pointer"
          :class="{ active: editor?.isActive('highlight') }"
          :title="t('editor.highlight')"
          @click="
            const prev = showHighlightMenu;
            closeAllPopovers();
            showHighlightMenu = !prev;
          "
        >
          <Highlighter class="size-3.5" />
        </button>

        <div
          v-if="showHighlightMenu"
          class="toolbar-dropdown p-2.5 grid grid-cols-4 gap-1.5 w-48"
        >
          <button
            v-for="color in HIGHLIGHT_COLORS"
            :key="color.value"
            type="button"
            class="size-7 rounded-lg flex items-center justify-center transition hover:scale-110 shadow-2xs cursor-pointer"
            :class="color.class"
            :title="color.name"
            @click="setHighlightColor(color.value)"
          >
            <Check
              v-if="(color.value === '' && !editor?.isActive('highlight')) || editor?.isActive('highlight', { color: color.value })"
              class="size-3 text-ink drop-shadow"
            />
          </button>
        </div>
      </div>

      <div class="toolbar-divider" />

      <!-- LISTS & BLOCKS -->
      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('bulletList') }"
        :title="t('editor.bulletList')"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <List class="size-3.5" />
      </button>

      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('orderedList') }"
        :title="t('editor.orderedList')"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered class="size-3.5" />
      </button>

      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('taskList') }"
        :title="t('editor.taskList')"
        @click="editor?.chain().focus().toggleTaskList().run()"
      >
        <ListTodo class="size-3.5" />
      </button>

      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('blockquote') }"
        :title="t('editor.quote')"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        <Quote class="size-3.5" />
      </button>

      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('codeBlock') }"
        :title="t('editor.codeBlock')"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
      >
        <SquareCode class="size-3.5" />
      </button>

      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('code') }"
        :title="t('editor.inlineCode')"
        @click="editor?.chain().focus().toggleCode().run()"
      >
        <Code class="size-3.5" />
      </button>

      <div class="toolbar-divider" />

      <!-- LINK -->
      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :class="{ active: editor?.isActive('link') }"
        :title="t('editor.link')"
        @click="openLinkPrompt"
      >
        <LinkIcon class="size-3.5" />
      </button>

      <!-- CLEAR FORMATTING -->
      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :title="t('editor.clearFormat')"
        @click="clearFormatting"
      >
        <Eraser class="size-3.5" />
      </button>

      <div class="toolbar-divider" />

      <!-- UNDO / REDO -->
      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :disabled="!editor?.can().undo()"
        :title="t('editor.undo')"
        @click="editor?.chain().focus().undo().run()"
      >
        <Undo2 class="size-3.5" />
      </button>

      <button
        type="button"
        class="toolbar-btn cursor-pointer"
        :disabled="!editor?.can().redo()"
        :title="t('editor.redo')"
        @click="editor?.chain().focus().redo().run()"
      >
        <Redo2 class="size-3.5" />
      </button>
    </div>

    <!-- LINK MODAL / POPOVER -->
    <div
      v-if="showLinkModal"
      class="border-b border-line bg-surface px-3 py-2 flex items-center gap-2 text-xs"
    >
      <LinkIcon class="size-3.5 text-accent shrink-0" />
      <input
        v-model="linkUrl"
        type="url"
        class="flex-1 rounded-md border border-line bg-canvas px-2.5 py-1 text-xs text-ink outline-none focus:border-accent"
        :placeholder="t('editor.linkUrl')"
        @keydown.enter.prevent="saveLink"
        @keydown.esc="showLinkModal = false"
      />
      <button
        type="button"
        class="rounded-md bg-accent px-2.5 py-1 font-semibold text-white hover:bg-accent-dark cursor-pointer"
        @click="saveLink"
      >
        {{ t('editor.insertLink') }}
      </button>
      <button
        v-if="editor?.isActive('link')"
        type="button"
        class="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 cursor-pointer"
        :title="t('editor.removeLink')"
        @click="removeLink"
      >
        <Unlink class="size-3" />
      </button>
      <button
        type="button"
        class="rounded-md px-2 py-1 text-muted hover:bg-canvas cursor-pointer"
        @click="showLinkModal = false"
      >
        {{ t('common.cancel') }}
      </button>
    </div>

    <!-- EDITOR CONTENT AREA -->
    <EditorContent
      :editor="editor"
      class="tiptap-content-container flex-1 px-3.5 py-2.5 text-sm text-ink outline-none cursor-text scrollbar-thin"
      :style="{ minHeight }"
    />
  </div>
</template>

<style>
/* TipTap ProseMirror Styling */
.tiptap-content-container {
  position: relative;
  z-index: 1;
}

.tiptap-content-container .tiptap {
  outline: none;
  min-height: 100%;
  word-break: break-word;
  line-height: 1.6;
}

.tiptap-content-container .tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--color-muted);
  opacity: 0.7;
  pointer-events: none;
  user-select: none;
  height: 0;
  z-index: 0;
}

.tiptap-content-container .tiptap p {
  margin-top: 0.3rem;
  margin-bottom: 0.3rem;
}

.tiptap-content-container .tiptap h1 {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
  margin-top: 0.75rem;
  margin-bottom: 0.4rem;
  color: var(--color-ink);
}

.tiptap-content-container .tiptap h2 {
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.35;
  margin-top: 0.6rem;
  margin-bottom: 0.35rem;
  color: var(--color-ink);
}

.tiptap-content-container .tiptap h3 {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 0.5rem;
  margin-bottom: 0.3rem;
  color: var(--color-ink);
}

.tiptap-content-container .tiptap ul:not([data-type="taskList"]) {
  list-style-type: disc;
  padding-left: 1.4rem;
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.tiptap-content-container .tiptap ol {
  list-style-type: decimal;
  padding-left: 1.4rem;
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.tiptap-content-container .tiptap li {
  margin-top: 0.15rem;
  margin-bottom: 0.15rem;
}

.tiptap-content-container .tiptap ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.tiptap-content-container .tiptap ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.tiptap-content-container .tiptap ul[data-type="taskList"] li > label {
  margin-top: 0.2rem;
  user-select: none;
}

.tiptap-content-container .tiptap ul[data-type="taskList"] li > label input[type="checkbox"] {
  accent-color: var(--color-accent);
  cursor: pointer;
}

.tiptap-content-container .tiptap ul[data-type="taskList"] li > div {
  flex: 1 1 auto;
}

.tiptap-content-container .tiptap blockquote {
  border-left: 3px solid var(--color-accent);
  padding-left: 0.85rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  font-style: italic;
  color: var(--color-muted);
  background: color-mix(in oklab, var(--color-accent) 6%, transparent);
  border-radius: 0 0.375rem 0.375rem 0;
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
}

.tiptap-content-container .tiptap pre {
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

.tiptap-content-container .tiptap code {
  background: color-mix(in oklab, var(--color-ink) 8%, var(--color-canvas));
  border-radius: 0.3rem;
  padding: 0.15rem 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
}

.tiptap-content-container .tiptap pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
}

.tiptap-content-container .tiptap a {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  font-weight: 500;
  cursor: pointer;
}

.tiptap-content-container .tiptap u {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.tiptap-content-container .tiptap s {
  text-decoration: line-through;
  opacity: 0.75;
}

.tiptap-content-container .tiptap mark {
  border-radius: 0.2rem;
  padding: 0.05rem 0.2rem;
}
</style>

<style scoped>
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.75rem;
  min-width: 1.75rem;
  padding: 0 0.35rem;
  border-radius: 0.375rem;
  color: var(--color-muted);
  font-size: 0.8125rem;
  transition: all 120ms ease;
  cursor: pointer;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--color-canvas);
  color: var(--color-ink);
}

.toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background: color-mix(in oklab, var(--color-accent) 15%, var(--color-surface));
  color: var(--color-accent);
  font-weight: 600;
}

.toolbar-divider {
  width: 1px;
  height: 1.1rem;
  background: var(--color-line);
  margin: 0 0.2rem;
}

.editor-toolbar {
  position: relative;
  z-index: 30;
}

.toolbar-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 10700 !important;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 0.6rem;
  box-shadow: 0 12px 30px -5px rgba(27, 25, 20, 0.18), 0 8px 10px -6px rgba(27, 25, 20, 0.12);
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  border-radius: 0.375rem;
  color: var(--color-ink);
  font-size: 0.8125rem;
  text-align: left;
  transition: background-color 100ms ease;
  cursor: pointer;
  white-space: nowrap;
}

.dropdown-item:hover {
  background: var(--color-canvas);
  color: var(--color-accent);
}

.dropdown-item.active {
  background: color-mix(in oklab, var(--color-accent) 12%, var(--color-surface));
  color: var(--color-accent);
  font-weight: 600;
}
</style>
