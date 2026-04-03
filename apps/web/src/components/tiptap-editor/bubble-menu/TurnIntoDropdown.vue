<script setup lang="ts">
import type { TurnIntoDropdownProps } from '../typing'
import { computed, ref } from 'vue'

const props = defineProps<TurnIntoDropdownProps>()

const visible = ref(false)

interface TurnIntoItem {
  label: string
  icon: string
  isActive: () => boolean
  command: () => void
}

const items = computed<TurnIntoItem[]>(() => {
  const e = props.editor
  return [
    {
      label: 'Text',
      icon: 'T',
      isActive: () => e.isActive('paragraph') && !e.isActive('bulletList') && !e.isActive('orderedList') && !e.isActive('codeBlock') && !e.isActive('blockquote'),
      command: () => e.chain().focus().setParagraph().run(),
    },
    {
      label: 'Heading 1',
      icon: 'H1',
      isActive: () => e.isActive('heading', { level: 1 }),
      command: () => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: 'Heading 2',
      icon: 'H2',
      isActive: () => e.isActive('heading', { level: 2 }),
      command: () => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Heading 3',
      icon: 'H3',
      isActive: () => e.isActive('heading', { level: 3 }),
      command: () => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'Bulleted list',
      icon: 'list-ul',
      isActive: () => e.isActive('bulletList'),
      command: () => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: 'list-ol',
      isActive: () => e.isActive('orderedList'),
      command: () => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Code',
      icon: 'code',
      isActive: () => e.isActive('codeBlock'),
      command: () => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: 'Quote',
      icon: 'quote',
      isActive: () => e.isActive('blockquote'),
      command: () => e.chain().focus().toggleBlockquote().run(),
    },
    {
      label: 'Task list',
      icon: 'task',
      isActive: () => e.isActive('taskList'),
      command: () => e.chain().focus().toggleTaskList().run(),
    },
  ]
})

function handleSelect(item: TurnIntoItem) {
  item.command()
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
      <button class="bubble-btn" title="Turn into">
        <span class="text-sm font-semibold">T</span>
      </button>
    </template>

    <div class="turn-into-menu">
      <div class="turn-into-menu__header">
        Turn into
      </div>
      <div
        v-for="item in items"
        :key="item.label"
        class="turn-into-menu__item"
        :class="{ 'is-active': item.isActive() }"
        @click="handleSelect(item)"
      >
        <span class="turn-into-menu__icon">
          <template v-if="item.icon === 'list-ul'">
            <SvgIcon category="ui" icon="list-bulleted" size="1rem" />
          </template>
          <template v-else-if="item.icon === 'list-ol'">
            <SvgIcon category="ui" icon="list-numbered" size="1rem" />
          </template>
          <template v-else-if="item.icon === 'code'">
            <SvgIcon category="ui" icon="code" size="1rem" />
          </template>
          <template v-else-if="item.icon === 'quote'">
            <SvgIcon category="ui" icon="quotes" size="1rem" />
          </template>
          <template v-else-if="item.icon === 'task'">
            <SvgIcon category="ui" icon="task" size="1rem" />
          </template>
          <template v-else>
            <span class="font-semibold text-sm">{{ item.icon }}</span>
          </template>
        </span>
        <span class="turn-into-menu__label">{{ item.label }}</span>
        <SvgIcon v-if="item.isActive()" category="ui" icon="check" size="0.875rem" class="turn-into-menu__check" />
      </div>
    </div>
  </ElPopover>
</template>

<style scoped lang="scss">
.turn-into-menu {
  &__header {
    padding: 4px 8px 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: 500;
  }

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
