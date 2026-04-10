<script setup lang="ts">
import type { ColorPickerDropdownProps } from '../typing'
import { reactive, shallowRef } from 'vue'

const props = defineProps<ColorPickerDropdownProps>()

const visible = shallowRef(false)

interface RecentColor {
  /** 最近使用颜色的应用维度 */
  kind: 'text' | 'highlight'
  /** 颜色值 */
  color: string
}

const textColors = [
  { label: '默认', value: '' },
  { label: '灰色', value: '#787774' },
  { label: '棕色', value: '#9f6b53' },
  { label: '橙色', value: '#d9730d' },
  { label: '黄色', value: '#cb8d02' },
  { label: '绿色', value: '#448361' },
  { label: '蓝色', value: '#337ea9' },
  { label: '紫色', value: '#9065b0' },
  { label: '粉色', value: '#c14c8a' },
  { label: '红色', value: '#d44c47' },
]

const bgColors = [
  { label: '默认', value: '' },
  { label: '灰色', value: '#f1f1ef' },
  { label: '棕色', value: '#f4eeee' },
  { label: '橙色', value: '#fbecdd' },
  { label: '黄色', value: '#fbf3db' },
  { label: '绿色', value: '#edf3ec' },
  { label: '蓝色', value: '#e7f3f8' },
  { label: '紫色', value: '#f6f3f9' },
  { label: '粉色', value: '#faf1f5' },
  { label: '红色', value: '#fdebec' },
]

const recentColors = reactive<RecentColor[]>([])

function addRecent(kind: RecentColor['kind'], color: string) {
  if (!color)
    return

  const idx = recentColors.findIndex(item => item.kind === kind && item.color === color)

  if (idx !== -1)
    recentColors.splice(idx, 1)

  recentColors.unshift({ kind, color })

  if (recentColors.length > 4)
    recentColors.pop()
}

function applyTextColor(color: string) {
  if (!color) {
    props.editor.chain().focus().unsetColor().run()
  }
  else {
    props.editor.chain().focus().setColor(color).run()
    addRecent('text', color)
  }
}

function applyBgColor(color: string) {
  if (!color) {
    props.editor.chain().focus().unsetHighlight().run()
  }
  else {
    props.editor.chain().focus().setHighlight({ color }).run()
    addRecent('highlight', color)
  }
}

function applyRecentColor(item: RecentColor) {
  if (item.kind === 'text') {
    applyTextColor(item.color)
    return
  }

  applyBgColor(item.color)
}

function isColorButtonActive() {
  return Boolean(getActiveTextColor() || getActiveHighlightColor())
}

function getActiveTextColor(): string {
  const color = props.editor.getAttributes('textStyle').color

  return typeof color === 'string' ? color : ''
}

function getActiveHighlightColor(): string {
  if (!props.editor.isActive('highlight')) {
    return ''
  }

  const color = props.editor.getAttributes('highlight').color

  return typeof color === 'string' ? color : ''
}

function getColorButtonIndicatorColor() {
  return getActiveTextColor() || getActiveHighlightColor() || 'var(--el-text-color-secondary)'
}

function isActiveTextColor(color: string): boolean {
  return color ? getActiveTextColor() === color : !getActiveTextColor()
}

function isActiveBgColor(color: string): boolean {
  if (!color)
    return !props.editor.isActive('highlight')
  return props.editor.isActive('highlight', { color })
}

function getRecentColorKey(item: RecentColor) {
  return `${item.kind}:${item.color}`
}

function getRecentColorStyle(item: RecentColor) {
  return item.kind === 'highlight' ? { backgroundColor: item.color } : undefined
}

function getRecentColorLabelStyle(item: RecentColor) {
  return {
    color: item.kind === 'text'
      ? item.color
      : isLightColor(item.color)
        ? '#37352f'
        : '#fff',
  }
}

function getRecentColorTitle(item: RecentColor) {
  return `${item.kind === 'text' ? '文字' : '背景'}：${item.color}`
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
      <button
        class="bubble-btn"
        :class="{ 'is-active': isColorButtonActive() }"
        title="颜色"
        type="button"
        @mousedown.prevent
      >
        <span class="color-btn-icon" :style="{ '--color-btn-indicator': getColorButtonIndicatorColor() }">A</span>
      </button>
    </template>

    <div class="color-picker">
      <template v-if="recentColors.length > 0">
        <div class="color-picker__section-title">
          最近使用
        </div>
        <div class="color-picker__grid">
          <button
            v-for="item in recentColors"
            :key="getRecentColorKey(item)"
            class="color-picker__swatch"
            :class="{ 'is-text': item.kind === 'text' }"
            :style="getRecentColorStyle(item)"
            :title="getRecentColorTitle(item)"
            type="button"
            @mousedown.prevent
            @click="applyRecentColor(item)"
          >
            <span class="color-picker__swatch-label" :style="getRecentColorLabelStyle(item)">A</span>
          </button>
        </div>
      </template>

      <div class="color-picker__section-title">
        文字颜色
      </div>
      <div class="color-picker__grid">
        <button
          v-for="c in textColors"
          :key="`text-${c.value}`"
          class="color-picker__swatch is-text"
          :class="{ 'is-active': isActiveTextColor(c.value), 'is-default': !c.value }"
          :title="c.label"
          type="button"
          @mousedown.prevent
          @click="applyTextColor(c.value)"
        >
          <span class="color-picker__swatch-label" :style="{ color: c.value || '#37352f' }">A</span>
        </button>
      </div>

      <div class="color-picker__section-title">
        背景颜色
      </div>
      <div class="color-picker__grid">
        <button
          v-for="c in bgColors"
          :key="`bg-${c.value}`"
          class="color-picker__swatch"
          :class="{ 'is-active': isActiveBgColor(c.value), 'is-default': !c.value }"
          :style="c.value ? { backgroundColor: c.value } : {}"
          :title="c.label"
          type="button"
          @mousedown.prevent
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
  position: relative;
  width: 14px;
  height: 16px;
  color: currentColor;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;

  &::after {
    position: absolute;
    right: 0;
    bottom: -2px;
    left: 0;
    height: 2px;
    content: '';
    border-radius: 999px;
    background: var(--color-btn-indicator);
  }
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

    &.is-default,
    &.is-text {
      border-color: var(--el-border-color);
    }
  }

  &__swatch-label {
    font-size: 14px;
    font-weight: 700;
  }
}
</style>
