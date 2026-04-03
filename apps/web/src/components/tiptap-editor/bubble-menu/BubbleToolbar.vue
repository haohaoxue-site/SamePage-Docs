<script setup lang="ts">
import type { BubbleToolbarProps } from '../typing'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { ref } from 'vue'
import ColorPickerDropdown from './ColorPickerDropdown.vue'
import TurnIntoDropdown from './TurnIntoDropdown.vue'

const props = defineProps<BubbleToolbarProps>()

const linkPopoverVisible = ref(false)
const linkUrl = ref('')

function toggleLink() {
  const attrs = props.editor.getAttributes('link')
  linkUrl.value = attrs.href || 'https://'
  linkPopoverVisible.value = true
}

function applyLink() {
  const href = linkUrl.value.trim()
  if (!href) {
    props.editor.chain().focus().unsetLink().run()
  }
  else {
    props.editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }
  linkPopoverVisible.value = false
}

function removeLink() {
  props.editor.chain().focus().unsetLink().run()
  linkPopoverVisible.value = false
}
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :tippy-options="{ duration: 150, maxWidth: 'none' }"
  >
    <div class="bubble-toolbar">
      <div class="bubble-toolbar__row">
        <TurnIntoDropdown :editor="editor" />
        <ColorPickerDropdown :editor="editor" />

        <div class="bubble-toolbar__divider" />

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('bold') }"
          title="Bold"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <span class="font-bold text-sm">B</span>
        </button>

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('italic') }"
          title="Italic"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <span class="text-sm italic">I</span>
        </button>

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('underline') }"
          title="Underline"
          @click="editor.chain().focus().toggleUnderline().run()"
        >
          <span class="text-sm underline">U</span>
        </button>
      </div>

      <div class="bubble-toolbar__row">
        <ElPopover
          v-model:visible="linkPopoverVisible"
          trigger="click"
          placement="bottom-start"
          :offset="6"
          :show-arrow="false"
          :width="320"
          popper-class="bubble-link-popover"
        >
          <template #reference>
            <button
              class="bubble-btn"
              :class="{ 'is-active': editor.isActive('link') }"
              title="Link"
              @click="toggleLink"
            >
              <SvgIcon category="ui" icon="link" size="1rem" />
            </button>
          </template>

          <div class="link-input-panel">
            <ElInput
              v-model="linkUrl"
              size="small"
              placeholder="Paste link..."
              @keydown.enter="applyLink"
            />
            <div class="link-input-panel__actions">
              <ElButton size="small" type="primary" @click="applyLink">
                Apply
              </ElButton>
              <ElButton v-if="editor.isActive('link')" size="small" @click="removeLink">
                Remove
              </ElButton>
            </div>
          </div>
        </ElPopover>

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('strike') }"
          title="Strikethrough"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <span class="text-sm line-through">S</span>
        </button>

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('code') }"
          title="Inline Code"
          @click="editor.chain().focus().toggleCode().run()"
        >
          <SvgIcon category="ui" icon="code" size="1rem" />
        </button>
      </div>
    </div>
  </BubbleMenu>
</template>

<style scoped lang="scss">
.bubble-toolbar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  background: var(--brand-bg-surface-raised);
  border-radius: 10px;
  border: 1px solid var(--brand-border-base);
  box-shadow: var(--brand-shadow-floating);

  &__row {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__divider {
    width: 1px;
    height: 20px;
    background-color: var(--el-border-color-light);
    margin: 0 4px;
  }
}

.link-input-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
}
</style>

<style lang="scss">
.bubble-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--el-text-color-primary);
  transition: all 0.15s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &.is-active {
    background-color: var(--el-color-primary-light-8);
    color: var(--el-color-primary);
  }
}

.bubble-turn-into-popover,
.bubble-color-picker-popover,
.bubble-link-popover {
  padding: 8px !important;
  border-radius: 10px !important;
  border: 1px solid var(--brand-border-base) !important;
  background: var(--brand-bg-surface-raised) !important;
  box-shadow: var(--brand-shadow-floating) !important;
}
</style>
