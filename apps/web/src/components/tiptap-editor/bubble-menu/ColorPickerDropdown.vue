<script setup lang="ts">
import type { ColorPickerDropdownProps } from '../typing'
import { reactive, ref } from 'vue'

const props = defineProps<ColorPickerDropdownProps>()

const visible = ref(false)

const textColors = [
  { label: 'Default', value: '' },
  { label: 'Gray', value: '#787774' },
  { label: 'Brown', value: '#9f6b53' },
  { label: 'Orange', value: '#d9730d' },
  { label: 'Yellow', value: '#cb8d02' },
  { label: 'Green', value: '#448361' },
  { label: 'Blue', value: '#337ea9' },
  { label: 'Purple', value: '#9065b0' },
  { label: 'Pink', value: '#c14c8a' },
  { label: 'Red', value: '#d44c47' },
]

const bgColors = [
  { label: 'Default', value: '' },
  { label: 'Gray', value: '#f1f1ef' },
  { label: 'Brown', value: '#f4eeee' },
  { label: 'Orange', value: '#fbecdd' },
  { label: 'Yellow', value: '#fbf3db' },
  { label: 'Green', value: '#edf3ec' },
  { label: 'Blue', value: '#e7f3f8' },
  { label: 'Purple', value: '#f6f3f9' },
  { label: 'Pink', value: '#faf1f5' },
  { label: 'Red', value: '#fdebec' },
]

const recentColors = reactive<string[]>([])

function addRecent(color: string) {
  if (!color)
    return
  const idx = recentColors.indexOf(color)
  if (idx !== -1)
    recentColors.splice(idx, 1)
  recentColors.unshift(color)
  if (recentColors.length > 4)
    recentColors.pop()
}

function applyTextColor(color: string) {
  if (!color) {
    props.editor.chain().focus().unsetColor().run()
  }
  else {
    props.editor.chain().focus().setColor(color).run()
    addRecent(color)
  }
}

function applyBgColor(color: string) {
  if (!color) {
    props.editor.chain().focus().unsetHighlight().run()
  }
  else {
    props.editor.chain().focus().setHighlight({ color }).run()
    addRecent(color)
  }
}

function isActiveTextColor(color: string): boolean {
  if (!color)
    return !props.editor.getAttributes('textStyle').color
  return props.editor.getAttributes('textStyle').color === color
}

function isActiveBgColor(color: string): boolean {
  if (!color)
    return !props.editor.isActive('highlight')
  return props.editor.isActive('highlight', { color })
}
</script>

<script lang="ts">
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = Number.parseInt(c.slice(0, 2), 16)
  const g = Number.parseInt(c.slice(2, 4), 16)
  const b = Number.parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}
</script>

<template>
  <ElPopover
    v-model:visible="visible"
    trigger="click"
    placement="bottom-start"
    :offset="6"
    :show-arrow="false"
    :width="260"
    popper-class="bubble-color-picker-popover"
  >
    <template #reference>
      <button class="bubble-btn" title="Color">
        <span class="color-btn-icon">A</span>
      </button>
    </template>

    <div class="color-picker">
      <template v-if="recentColors.length > 0">
        <div class="color-picker__section-title">
          Recently used
        </div>
        <div class="color-picker__grid">
          <button
            v-for="color in recentColors"
            :key="color"
            class="color-picker__swatch"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="applyTextColor(color)"
          >
            <span class="color-picker__swatch-label" :style="{ color: isLightColor(color) ? '#37352f' : '#fff' }">A</span>
          </button>
        </div>
      </template>

      <div class="color-picker__section-title">
        Text color
      </div>
      <div class="color-picker__grid">
        <button
          v-for="c in textColors"
          :key="`text-${c.value}`"
          class="color-picker__swatch"
          :class="{ 'is-active': isActiveTextColor(c.value), 'is-default': !c.value }"
          :style="!c.value ? {} : { backgroundColor: 'transparent' }"
          :title="c.label"
          @click="applyTextColor(c.value)"
        >
          <span class="color-picker__swatch-label" :style="{ color: c.value || '#37352f' }">A</span>
        </button>
      </div>

      <div class="color-picker__section-title">
        Background color
      </div>
      <div class="color-picker__grid">
        <button
          v-for="c in bgColors"
          :key="`bg-${c.value}`"
          class="color-picker__swatch"
          :class="{ 'is-active': isActiveBgColor(c.value), 'is-default': !c.value }"
          :style="c.value ? { backgroundColor: c.value } : {}"
          :title="c.label"
          @click="applyBgColor(c.value)"
        >
          <span class="color-picker__swatch-label">A</span>
        </button>
      </div>
    </div>
  </ElPopover>
</template>

<style scoped lang="scss">
.color-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 700;
}

.color-picker {
  &__section-title {
    padding: 4px 4px 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: 500;

    &:not(:first-child) {
      margin-top: 8px;
    }
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__swatch {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    border: 1.5px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
    background-color: transparent;

    &:hover {
      border-color: var(--el-border-color);
      transform: scale(1.1);
    }

    &.is-active {
      border-color: var(--el-color-primary);
    }

    &.is-default {
      border-color: var(--el-border-color);
    }
  }

  &__swatch-label {
    font-size: 14px;
    font-weight: 700;
  }
}
</style>
