<script setup lang="ts">
import type { BubbleToolbarProps } from '../typing'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { ElMessage } from 'element-plus'
import { useTemplateRef } from 'vue'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'
import { useTiptapEditorLinkPanel } from '../composables/useTiptapEditorLinkPanel'
import { createUploadedImageInsertContent } from '../helpers/documentAsset'
import ColorPickerDropdown from './ColorPickerDropdown.vue'
import TurnIntoDropdown from './TurnIntoDropdown.vue'

const props = defineProps<BubbleToolbarProps>()
const imageInputRef = useTemplateRef<HTMLInputElement>('imageInputRef')

const linkPanel = useTiptapEditorLinkPanel(() => props.editor)
const LinkPanel = linkPanel.LinkPanel

function runCommand(command: (editor: BubbleToolbarProps['editor']) => void) {
  command(props.editor)
}

function shouldShowToolbar({
  editor,
  from,
  to,
}: {
  editor: BubbleToolbarProps['editor']
  from: number
  to: number
}) {
  return editor.isActive('link') || from !== to
}

function shouldShowLinkPanel({
  from,
  to,
}: {
  from: number
  to: number
}) {
  return linkPanel.isOpen.value && from !== to
}

function toggleBold() {
  runCommand(editor => editor.chain().focus().toggleBold().run())
}

function toggleItalic() {
  runCommand(editor => editor.chain().focus().toggleItalic().run())
}

function toggleUnderline() {
  runCommand(editor => editor.chain().focus().toggleUnderline().run())
}

function toggleStrike() {
  runCommand(editor => editor.chain().focus().toggleStrike().run())
}

function toggleCode() {
  runCommand(editor => editor.chain().focus().toggleCode().run())
}

function handlePickImage() {
  imageInputRef.value?.click()
}

async function handleImageChange(event: Event) {
  if (!props.uploadImage) {
    return
  }

  const input = event.target

  if (!(input instanceof HTMLInputElement)) {
    return
  }

  const [file] = Array.from(input.files ?? [])
  input.value = ''

  if (!file) {
    return
  }

  try {
    const uploadedImage = await props.uploadImage(file)

    runCommand(editor => editor.chain().focus().insertContent(
      createUploadedImageInsertContent(uploadedImage),
    ).run())
  }
  catch (error) {
    ElMessage.error(getRequestErrorDisplayMessage(error, '图片上传失败'))
  }
}
</script>

<template>
  <BubbleMenu
    :editor="editor"
    plugin-key="bubbleToolbarMenu"
    :should-show="shouldShowToolbar"
    :options="{ placement: 'top', offset: 8 }"
  >
    <div class="bubble-toolbar">
      <div class="bubble-toolbar__row">
        <TurnIntoDropdown :editor="editor" />
        <ColorPickerDropdown :editor="editor" />
        <button
          v-if="props.uploadImage"
          class="bubble-btn"
          title="图片"
          type="button"
          @mousedown.prevent
          @click="handlePickImage"
        >
          <SvgIcon category="ui" icon="image" class="bubble-btn__icon" />
        </button>
        <input
          v-if="props.uploadImage"
          ref="imageInputRef"
          type="file"
          accept="image/gif,image/jpeg,image/png,image/webp"
          class="hidden"
          @change="handleImageChange"
        >

        <div class="bubble-toolbar__divider" />

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('bold') }"
          title="加粗"
          type="button"
          @mousedown.prevent
          @click="toggleBold"
        >
          <span class="bubble-btn__text font-bold text-sm">B</span>
        </button>

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('italic') }"
          title="斜体"
          type="button"
          @mousedown.prevent
          @click="toggleItalic"
        >
          <span class="bubble-btn__text text-sm italic">I</span>
        </button>

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('underline') }"
          title="下划线"
          type="button"
          @mousedown.prevent
          @click="toggleUnderline"
        >
          <span class="bubble-btn__text text-sm underline">U</span>
        </button>
        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('link') }"
          title="链接"
          type="button"
          @mousedown.prevent
          @click="linkPanel.toggle"
        >
          <SvgIcon category="ui" icon="link" class="bubble-btn__icon" />
        </button>

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('strike') }"
          title="删除线"
          type="button"
          @mousedown.prevent
          @click="toggleStrike"
        >
          <span class="bubble-btn__text text-sm line-through">S</span>
        </button>

        <button
          class="bubble-btn"
          :class="{ 'is-active': editor.isActive('code') }"
          title="代码"
          type="button"
          @mousedown.prevent
          @click="toggleCode"
        >
          <SvgIcon category="ui" icon="code" class="bubble-btn__icon" />
        </button>
      </div>
    </div>
  </BubbleMenu>

  <BubbleMenu
    :editor="editor"
    plugin-key="bubbleToolbarLinkPanel"
    :should-show="shouldShowLinkPanel"
    :options="{ placement: 'bottom', offset: 8 }"
  >
    <LinkPanel />
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
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
  }

  &__divider {
    width: 1px;
    height: 20px;
    margin: 0 4px;
    background-color: var(--el-border-color-light);
  }
}
</style>

<style lang="scss">
.bubble-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--el-text-color-primary);
  line-height: 1;
  transition: all 0.15s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &.is-active {
    background-color: var(--el-color-primary-light-8);
    color: var(--el-color-primary);
  }

  &__text,
  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  &__icon {
    display: block;
  }
}

.bubble-turn-into-popover,
.bubble-color-picker-popover {
  padding: 8px !important;
  border-radius: 10px !important;
  border: 1px solid var(--brand-border-base) !important;
  background: var(--brand-bg-surface-raised) !important;
  box-shadow: var(--brand-shadow-floating) !important;
}
</style>
