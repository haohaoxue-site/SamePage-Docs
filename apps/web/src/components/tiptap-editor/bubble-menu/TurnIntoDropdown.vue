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
      label: '正文',
      icon: 'T',
      isActive: () => e.isActive('paragraph') && !e.isActive('bulletList') && !e.isActive('orderedList') && !e.isActive('codeBlock') && !e.isActive('blockquote'),
      command: () => e.chain().focus().setParagraph().run(),
    },
    {
      label: '标题 1',
      icon: 'H1',
      isActive: () => e.isActive('heading', { level: 1 }),
      command: () => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: '标题 2',
      icon: 'H2',
      isActive: () => e.isActive('heading', { level: 2 }),
      command: () => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: '标题 3',
      icon: 'H3',
      isActive: () => e.isActive('heading', { level: 3 }),
      command: () => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: '无序列表',
      icon: 'list-ul',
      isActive: () => e.isActive('bulletList'),
      command: () => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: '有序列表',
      icon: 'list-ol',
      isActive: () => e.isActive('orderedList'),
      command: () => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '代码块',
      icon: 'code',
      isActive: () => e.isActive('codeBlock'),
      command: () => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: '引用',
      icon: 'quote',
      isActive: () => e.isActive('blockquote'),
      command: () => e.chain().focus().toggleBlockquote().run(),
    },
    {
      label: '任务列表',
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
      <button class="bubble-btn" title="文本" type="button" @mousedown.prevent>
        <span class="text-sm font-semibold">T</span>
      </button>
    </template>

    <div class="turn-into-menu">
      <div
        v-for="item in items"
        :key="item.label"
        class="turn-into-menu__item"
        :class="{ 'is-active': item.isActive() }"
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
          <template v-else-if="item.icon === 'task'">
            <SvgIcon category="ui" icon="task" />
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
