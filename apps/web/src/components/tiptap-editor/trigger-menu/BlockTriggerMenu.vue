<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import type { TurnIntoMenuItem } from '../helpers/turnIntoMenu'
import { FloatingMenu } from '@tiptap/vue-3/menus'
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { isTriggerMenuSelection } from '../helpers/triggerMenu'
import { getTurnIntoMenuItems } from '../helpers/turnIntoMenu'

interface BlockTriggerMenuProps {
  editor: Editor
}

/** 块触发菜单暴露方法 */
export interface BlockTriggerMenuExposed {
  openMenu: () => boolean
}

const props = defineProps<BlockTriggerMenuProps>()

const visible = shallowRef(false)
const items = computed(() => getTurnIntoMenuItems(props.editor))

function shouldShowTriggerMenu({ editor }: { editor: Editor }) {
  return editor.isEditable && isTriggerMenuSelection(editor)
}

function handleSelect(item: TurnIntoMenuItem) {
  props.editor.chain().focus().turnIntoBlock(item.target).run()
  visible.value = false
}

function openMenu() {
  if (!shouldShowTriggerMenu({ editor: props.editor })) {
    return false
  }

  visible.value = true
  return true
}

function handleSelectionUpdate() {
  if (!shouldShowTriggerMenu({ editor: props.editor })) {
    visible.value = false
  }
}

props.editor.on('selectionUpdate', handleSelectionUpdate)
props.editor.on('blur', handleSelectionUpdate)

onBeforeUnmount(() => {
  props.editor.off('selectionUpdate', handleSelectionUpdate)
  props.editor.off('blur', handleSelectionUpdate)
})

defineExpose<BlockTriggerMenuExposed>({
  openMenu,
})
</script>

<template>
  <FloatingMenu
    :editor="editor"
    plugin-key="blockTriggerMenu"
    :should-show="shouldShowTriggerMenu"
    :options="{ placement: 'left-start', offset: 12 }"
  >
    <ElPopover
      v-model:visible="visible"
      trigger="click"
      placement="bottom-start"
      :offset="8"
      :show-arrow="false"
      :width="220"
      popper-class="block-trigger-popover"
    >
      <template #reference>
        <button class="block-trigger-btn" type="button" title="块命令" @mousedown.prevent>
          <SvgIcon category="ui" icon="plus" size="0.875rem" />
        </button>
      </template>

      <div class="block-trigger-menu">
        <div class="block-trigger-menu__hint">
          输入 / 也可以打开这里
        </div>
        <button
          v-for="item in items"
          :key="item.label"
          class="block-trigger-menu__item"
          :class="{ 'is-active': item.isActive }"
          type="button"
          @mousedown.prevent
          @click="handleSelect(item)"
        >
          <span class="block-trigger-menu__icon">
            <template v-if="item.icon === 'list-ul'">
              <SvgIcon category="ui" icon="list-bulleted" />
            </template>
            <template v-else-if="item.icon === 'list-ol'">
              <SvgIcon category="ui" icon="list-numbered" />
            </template>
            <template v-else-if="item.icon === 'code'">
              <SvgIcon category="ui" icon="code" />
            </template>
            <template v-else-if="item.icon === 'quote'">
              <SvgIcon category="ui" icon="quotes" />
            </template>
            <template v-else-if="item.icon === 'divider'">
              <span class="block-trigger-menu__divider-icon" />
            </template>
            <template v-else-if="item.icon === 'task'">
              <SvgIcon category="ui" icon="task" />
            </template>
            <template v-else>
              <span class="text-sm font-semibold">{{ item.icon }}</span>
            </template>
          </span>
          <span class="block-trigger-menu__label">{{ item.label }}</span>
          <SvgIcon
            v-if="item.isActive"
            category="ui"
            icon="check"
            size="0.875rem"
            class="block-trigger-menu__check"
          />
        </button>
      </div>
    </ElPopover>
  </FloatingMenu>
</template>

<style scoped lang="scss">
.block-trigger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border: none;
  border-radius: 999px;
  background: var(--brand-bg-surface-raised);
  color: var(--el-text-color-secondary);
  box-shadow: var(--brand-shadow-floating);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--el-color-primary);
    transform: translateY(-1px);
  }
}

.block-trigger-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__hint {
    padding: 4px 8px 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.15s;
    text-align: left;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &.is-active {
      color: var(--el-color-primary);
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    font-size: 16px;
  }

  &__divider-icon {
    display: block;
    width: 14px;
    height: 1.5px;
    border-radius: 999px;
    background-color: currentColor;
  }

  &__label {
    flex: 1;
    font-size: 14px;
  }

  &__check {
    color: var(--el-color-primary);
  }
}
</style>

<style lang="scss">
.block-trigger-popover {
  padding: 8px !important;
  border-radius: 10px !important;
  border: 1px solid var(--brand-border-base) !important;
  background: var(--brand-bg-surface-raised) !important;
  box-shadow: var(--brand-shadow-floating) !important;
}
</style>
