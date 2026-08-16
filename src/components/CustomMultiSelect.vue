<template>
  <div class="custom-multiselect-container" :class="{ 'w-full': fluid }">
    <MultiSelect
      :id="controlId"
      v-model="computedSelectedItems"
      :options="computedOptions"
      :optionLabel="resolveOptionLabel"
      :optionValue="resolveOptionValue"
      :placeholder="placeholder"
      :appendTo="appendTo"
      :showClear="showClear"
      :filter="filter"
      :maxSelectedLabels="maxSelectedLabels"
      :class="[customclass, sizeClass, { 'w-full': fluid }]"
      :selectAllLabel="selectAllLabel"
      :loading="isLoading"
      :disabled="disabled"
      :fluid="fluid"
      @change="handleChange"
    >
      <template v-if="$slots.value" #value="slotProps">
        <slot name="value" v-bind="slotProps" />
      </template>
      <template v-if="$slots.option" #option="slotProps">
        <slot name="option" v-bind="slotProps" />
      </template>
    </MultiSelect>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MultiSelect from 'primevue/multiselect'

export interface MultiSelectOption {
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
    modelValue?: any[]
    selectedItems?: any[]
    options?: MultiSelectOption[] | string[] | number[]
    dataUrl?: string
    id?: string
    customclass?: string
    dependsOn?: string | null
    urlParams?: Record<string, any>
    autoLoad?: boolean
    paramName?: string
    placeholder?: string
    filter?: boolean
    showClear?: boolean
    maxSelectedLabels?: number
    selectAllLabel?: string
    disabled?: boolean
    fluid?: boolean
    size?: 'small' | 'normal' | 'large'
    optionLabel?: string | ((option: any) => string)
    optionValue?: string | ((option: any) => any)
    appendTo?: string
  }>(),
  {
    modelValue: undefined,
    selectedItems: () => [],
    options: () => [],
    dataUrl: '',
    id: 'MultiSelect',
    customclass: '',
    dependsOn: null,
    urlParams: () => ({}),
    autoLoad: true,
    paramName: 'customerIds',
    placeholder: 'Seleccionar elementos',
    filter: true,
    showClear: true,
    maxSelectedLabels: 3,
    selectAllLabel: 'Seleccionar Todos',
    disabled: false,
    fluid: true,
    size: 'normal',
    appendTo: 'body',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: any[]]
  'update:selectedItems': [value: any[]]
  'update:urlParams': [value: Record<string, any>]
  change: [value: any[]]
  error: [error: any]
  loaded: [items: any[]]
}>()

const controlId = computed(() => props.id)
const isLoading = ref(false)
const remoteOptions = ref<any[]>([])

const sizeClass = computed(() => {
  if (props.size === 'small') return 'p-multiselect-sm'
  if (props.size === 'large') return 'p-multiselect-lg'
  return ''
})

const computedOptions = computed(() => {
  if (props.options && props.options.length > 0) {
    return props.options
  }
  return remoteOptions.value
})

const computedSelectedItems = computed({
  get() {
    if (props.modelValue !== undefined) return props.modelValue
    if (props.selectedItems !== undefined) return props.selectedItems
    return []
  },
  set(newValue: any[]) {
    emit('update:modelValue', newValue)
    emit('update:selectedItems', newValue)
    emit('change', newValue)

    const selectedObjs = (newValue || []).map((val) =>
      computedOptions.value.find((opt: any) => resolveOptionValue(opt) === val)
    ).filter(Boolean)

    const customEvent = new CustomEvent('multiselect-changed', {
      detail: {
        componentId: controlId.value,
        selectedValues: newValue,
        selectedItems: selectedObjs,
      },
    })
    document.dispatchEvent(customEvent)
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
  if (opt.value !== undefined) return opt.value
  if (opt.id !== undefined) return opt.id
  if (opt.text !== undefined) return opt.text
  if (opt.name !== undefined) return opt.name
  return opt
}

function handleChange(e: any) {
  emit('change', e.value)
}

function buildUrlWithParams(): string {
  let url = props.dataUrl
  const parts: string[] = []
  Object.keys(props.urlParams).forEach((key) => {
    const val = props.urlParams[key]
    if (val === null || val === undefined || val === '') return
    if (key === props.paramName && typeof val === 'string' && val.includes(',')) {
      parts.push(`${encodeURIComponent(key)}=${val}`)
    } else if (Array.isArray(val)) {
      val.forEach((v) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`))
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    }
  })
  if (parts.length) {
    const separator = url.includes('?') ? '&' : '?'
    url += separator + parts.join('&')
  }
  return url
}

async function fetchOptions() {
  if (!props.dataUrl) return
  isLoading.value = true
  try {
    const finalUrl = buildUrlWithParams()
    const response = await fetch(finalUrl)
    if (!response.ok) throw new Error(`HTTP error ${response.status}`)
    const data = await response.json()
    if (Array.isArray(data)) {
      remoteOptions.value = data.map((item) => ({
        text: item.Name ?? item.name ?? item.text ?? item.label,
        value: item.Id ?? item.id ?? item.value,
        ...item,
      }))
      emit('loaded', remoteOptions.value)
    }
  } catch (error) {
    console.error('Error fetching data for MultiSelect:', error)
    remoteOptions.value = []
    emit('error', error)
  } finally {
    isLoading.value = false
  }
}

function handleDependencyChange(event: any) {
  if (event.detail && event.detail.componentId === props.dependsOn) {
    emit('update:modelValue', [])
    emit('update:selectedItems', [])
    const values = event.detail.selectedValues || []
    if (values.length > 0) {
      const joined = values.join(',')
      const newParams = { ...props.urlParams, [props.paramName]: joined }
      emit('update:urlParams', newParams)
      fetchOptions()
    } else {
      remoteOptions.value = []
    }
  }
}

watch(
  () => props.urlParams,
  () => {
    if (!props.dependsOn || Object.keys(props.urlParams).length > 0) {
      fetchOptions()
    }
  },
  { deep: true }
)

onMounted(() => {
  if (props.autoLoad && !props.dependsOn && props.dataUrl) {
    fetchOptions()
  }
  if (props.dependsOn) {
    document.addEventListener('multiselect-changed', handleDependencyChange)
  }
})

onBeforeUnmount(() => {
  if (props.dependsOn) {
    document.removeEventListener('multiselect-changed', handleDependencyChange)
  }
})

defineExpose({
  reload: fetchOptions,
})
</script>

<style scoped>
.custom-multiselect-container {
  display: inline-block;
  vertical-align: middle;
}
</style>

