<template>
  <div class="custom-datepicker-container" :class="{ 'w-full': fluid }">
    <DatePicker
      v-model="dateValue"
      :placeholder="placeholder"
      :dateFormat="dateFormat"
      :showIcon="showIcon"
      :iconDisplay="iconDisplay"
      :showButtonBar="showButtonBar"
      :showClear="showClear"
      :fluid="fluid"
      :disabled="disabled"
      :invalid="invalid"
      :minDate="minDate"
      :maxDate="maxDate"
      :appendTo="appendTo"
      :class="[customclass, sizeClass]"
      :pt="{
        root: { class: 'custom-dp-root' },
        input: { class: ['custom-dp-input', { 'p-invalid': invalid }] }
      }"
      @update:model-value="handleUpdate"
      @hide="$emit('hide')"
      @show="$emit('show')"
      @clear-click="handleClear"
      @today-click="handleToday"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DatePicker from 'primevue/datepicker'
import { parseDate, toISODate } from '@/lib/dates'

const props = withDefaults(
  defineProps<{
    modelValue?: string | Date | null
    placeholder?: string
    dateFormat?: string
    showIcon?: boolean
    iconDisplay?: 'input' | 'button'
    showButtonBar?: boolean
    showClear?: boolean
    fluid?: boolean
    disabled?: boolean
    invalid?: boolean
    size?: 'small' | 'normal' | 'large'
    minDate?: Date
    maxDate?: Date
    appendTo?: string
    customclass?: string
  }>(),
  {
    modelValue: null,
    placeholder: 'YYYY-MM-DD',
    dateFormat: 'yy-mm-dd',
    showIcon: true,
    iconDisplay: 'input',
    showButtonBar: true,
    showClear: false,
    fluid: true,
    disabled: false,
    invalid: false,
    size: 'normal',
    minDate: undefined,
    maxDate: undefined,
    appendTo: 'body',
    customclass: '',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  change: [value: string | null]
  hide: []
  show: []
}>()

function normalizeToDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return null
    try {
      const parsed = parseDate(trimmed)
      return isNaN(parsed.getTime()) ? null : parsed
    } catch {
      return null
    }
  }
  return null
}

const dateValue = ref<Date | null>(normalizeToDate(props.modelValue))

watch(
  () => props.modelValue,
  (newVal) => {
    const nextDate = normalizeToDate(newVal)
    const curTime = dateValue.value ? dateValue.value.getTime() : null
    const nextTime = nextDate ? nextDate.getTime() : null
    if (curTime !== nextTime) {
      dateValue.value = nextDate
    }
  }
)

const sizeClass = computed(() => {
  if (props.size === 'small') return 'p-datepicker-sm'
  if (props.size === 'large') return 'p-datepicker-lg'
  return ''
})

function handleUpdate(val: any) {
  let isoStr: string | null = null
  if (val instanceof Date && !isNaN(val.getTime())) {
    isoStr = toISODate(val)
  }
  emit('update:modelValue', isoStr)
  emit('change', isoStr)
}

function handleClear() {
  emit('update:modelValue', null)
  emit('change', null)
}

function handleToday() {
  const today = toISODate(new Date())
  emit('update:modelValue', today)
  emit('change', today)
}
</script>

<style scoped>
.custom-datepicker-container {
  display: inline-block;
  vertical-align: middle;
}
</style>
