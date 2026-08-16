<template>
  <div class="custom-select-container" :class="{ 'w-full': fluid }">
    <Select
      v-model="selectedValue"
      :options="computedItems"
      :optionLabel="resolveOptionLabel"
      :optionValue="resolveOptionValue"
      :placeholder="placeholder"
      :class="[customclass, sizeClass]"
      :filter="filter"
      :showClear="showClear"
      :fluid="fluid"
      :disabled="disabled"
      :appendTo="appendTo"
      :loading="isLoading"
      @change="handleChange"
    >
      <template v-if="$slots.value" #value="slotProps">
        <slot name="value" v-bind="slotProps" />
      </template>
      <template v-if="$slots.option" #option="slotProps">
        <slot name="option" v-bind="slotProps" />
      </template>
    </Select>
    <!-- Hidden input to maintain form / jQuery compatibility -->
    <input
      v-if="controlId"
      type="hidden"
      :id="controlId"
      :name="controlId"
      :value="selectedValue ?? ''"
      ref="hiddenInput"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Select from 'primevue/select'

export interface SelectOption {
  label?: string
  text?: string
  name?: string
  fullName?: string
  title?: string
  value?: any
  id?: any
  [key: string]: any
}

const props = withDefaults(
  defineProps<{
    modelValue?: any
    selectedvalue?: any
    options?: SelectOption[] | string[] | number[]
    source?: string
    dataUrl?: string
    id?: string
    customclass?: string
    useid?: boolean
    placeholder?: string
    filter?: boolean
    showClear?: boolean
    fluid?: boolean
    disabled?: boolean
    size?: 'small' | 'normal' | 'large'
    optionLabel?: string | ((option: any) => string)
    optionValue?: string | ((option: any) => any)
    appendTo?: string
  }>(),
  {
    modelValue: undefined,
    selectedvalue: undefined,
    options: () => [],
    source: '',
    dataUrl: '',
    id: '',
    customclass: '',
    useid: false,
    placeholder: 'Seleccionar',
    filter: false,
    showClear: false,
    fluid: true,
    disabled: false,
    size: 'normal',
    appendTo: 'body',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: any]
  'update:selectedvalue': [value: any]
  change: [value: any]
  loaded: [items: any[]]
}>()

const fetchedItems = ref<any[]>([])
const isLoading = ref(false)
const hiddenInput = ref<HTMLInputElement | null>(null)

const controlId = computed(() => props.id)

const computedItems = computed(() => {
  if (props.options && props.options.length > 0) {
    return props.options
  }
  return fetchedItems.value
})

const sizeClass = computed(() => {
  if (props.size === 'small') return 'p-select-sm'
  if (props.size === 'large') return 'p-select-lg'
  return ''
})

const selectedValue = computed({
  get() {
    if (props.modelValue !== undefined) return props.modelValue
    if (props.selectedvalue !== undefined) return props.selectedvalue
    return null
  },
  set(val) {
    emit('update:modelValue', val)
    emit('update:selectedvalue', val)
    emit('change', val)
    dispatchCustomEvent(val)
    syncHiddenInput(val)
  },
})

function resolveOptionLabel(opt: any): string {
  if (opt === null || opt === undefined) return ''
  if (typeof opt === 'string' || typeof opt === 'number') return String(opt)
  if (typeof props.optionLabel === 'function') return props.optionLabel(opt)
  if (props.optionLabel && opt[props.optionLabel] !== undefined) return String(opt[props.optionLabel])
  return String(opt.label ?? opt.text ?? opt.name ?? opt.fullName ?? opt.title ?? opt.value ?? opt.id ?? opt)
}

function resolveOptionValue(opt: any): any {
  if (opt === null || opt === undefined) return opt
  if (typeof opt === 'string' || typeof opt === 'number') return opt
  if (typeof props.optionValue === 'function') return props.optionValue(opt)
  if (props.optionValue && opt[props.optionValue] !== undefined) return opt[props.optionValue]
  if (props.useid) return opt.id !== undefined ? opt.id : opt.value
  if (opt.value !== undefined) return opt.value
  if (opt.id !== undefined) return opt.id
  if (opt.text !== undefined) return opt.text
  if (opt.name !== undefined) return opt.name
  return opt
}

function dispatchCustomEvent(newVal: any) {
  const selectedItem = computedItems.value.find((opt: any) => resolveOptionValue(opt) === newVal)
  const customEvent = new CustomEvent('customselect-changed', {
    detail: {
      componentId: controlId.value,
      selectedValue: newVal,
      selectedItem,
    },
  })
  document.dispatchEvent(customEvent)
}

function syncHiddenInput(newVal: any) {
  if (hiddenInput.value) {
    hiddenInput.value.value = newVal !== null && newVal !== undefined ? String(newVal) : ''
    const event = new Event('change', { bubbles: true })
    hiddenInput.value.dispatchEvent(event)
    if ((window as any).jQuery) {
      ;(window as any).jQuery(hiddenInput.value).trigger('change')
    }
  }
}

function handleChange(e: any) {
  emit('change', e.value)
}

async function fetchData() {
  const url = props.source || props.dataUrl
  if (!url) return

  isLoading.value = true
  try {
    const targetUrl = url.startsWith('http') ? url : `${window.location.origin}/${url.replace(/^\//, '')}`
    const res = await fetch(targetUrl)
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      fetchedItems.value = data
      emit('loaded', data)
    }
  } catch (err) {
    console.error('CustomSelect error fetching options:', err)
    fetchedItems.value = []
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.source || props.dataUrl,
  () => {
    fetchData()
  }
)

onMounted(() => {
  if (props.source || props.dataUrl) {
    fetchData()
  }
})
</script>

<style scoped>
.custom-select-container {
  display: inline-block;
  vertical-align: middle;
}
</style>