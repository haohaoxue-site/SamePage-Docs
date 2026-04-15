<script setup lang="ts">
import type { TurnIntoBlockType } from '@haohaoxue/samepage-domain'
import type { TurnIntoDropdownProps } from '../typing'
import { computed, shallowRef } from 'vue'
import { isTurnIntoBlockActive } from '../extensions/BlockCommands'

const props = defineProps<TurnIntoDropdownProps>()

const visible = shallowRef(false)

/** 菜单项 */
interface TurnIntoItem {
  label: string
  icon: string
  target: TurnIntoBlockType
  isActive: boolean
}

const turnIntoItems = [
  {
    label: '正文',
    icon: 'T',
    target: 'paragraph',
  },
  {
    label: '标题 1',
    icon: 'H1',
    target: 'heading-1',
  },
  {
    label: '标题 2',
    icon: 'H2',
    target: 'heading-2',
  },
  {
    label: '标题 3',
    icon: 'H3',
    target: 'heading-3',
  },
  {
    label: '无序列表',
    icon: 'list-ul',
    target: 'bulletList',
  },
  {
    label: '有序列表',
    icon: 'list-ol',
    target: 'orderedList',
  },
  {
    label: '代码块',
    icon: 'code',
    target: 'codeBlock',
  },
  {
    label: '引用',
    icon: 'quote',
    target: 'blockquote',
  },
  {
    label: '分割线',
    icon: 'divider',
    target: 'divider',
  },
  {
    label: '任务列表',
    icon: 'task',
    target: 'taskList',
  },
] satisfies Array<Pick<TurnIntoItem, 'label' | 'icon' | 'target'>>

const items = computed<TurnIntoItem[]>(() =>
  turnIntoItems.map(item => ({
    ...item,
    isActive: isTurnIntoBlockActive(props.editor, item.target),
  })),
)

function handleSelect(item: TurnIntoItem) {
  props.editor.chain().focus().turnIntoBlock(item.target).run()
  visible.value = false
}
</script>

<template>
  <ElPopover
    v-model:visible="visible"
    trigger="click"
    placement="bottom-start"
    :offset="6"
    :show-arrow="false"
    :width="220"
    popper-class="bubble-turn-into-popover"
  >
    <template #reference>
      <button class="bubble-btn" title="文本" type="button" @mousedown.prevent>
        <span class="text-sm font-semibold">T</span>
      </button>
    </template>

    <div class="turn-into-menu">
      <div
        v-for="item in items"
        :key="item.label"
        class="turn-into-menu__item"
        :class="{ 'is-active': item.isActive }"
        @mousedown.prevent
        @click="handleSelect(item)"
      >
        <span class="turn-into-menu__icon">
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
            <span class="turn-into-menu__divider-icon" />
          </template>
          <template v-else-if="item.icon === 'task'">
            <SvgIcon category="ui" icon="task" />
          </template>
          <template v-else>
            <span class="font-semibold text-sm">{{ item.icon }}</span>
          </template>
        </span>
        <span class="turn-into-menu__label">{{ item.label }}</span>
        <SvgIcon v-if="item.isActive" category="ui" icon="check" size="0.875rem" class="turn-into-menu__check" />
      </div>
    </div>
  </ElPopover>
</template>

<style scoped lang="scss">
.turn-into-menu {
  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s;

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
    font-size: 14px;
    color: var(--el-color-primary);
  }
}
</style>
