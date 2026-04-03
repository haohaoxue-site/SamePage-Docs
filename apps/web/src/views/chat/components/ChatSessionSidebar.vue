<script setup lang="ts">
import type {
  ChatSessionSidebarEmits,
  ChatSessionSidebarProps,
} from '../typing'
import { ElMessageBox } from 'element-plus'

const props = defineProps<ChatSessionSidebarProps>()

const emits = defineEmits<ChatSessionSidebarEmits>()

async function confirmDelete(session: ChatSessionSidebarProps['sessions'][number]) {
  const sessionTitle = session.title.trim() || '未命名对话'
  const confirmed = await ElMessageBox.confirm(
    `确认删除「${sessionTitle}」吗？此操作不可恢复。`,
    '删除对话',
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    },
  ).then(() => true).catch(() => false)

  if (!confirmed) {
    return
  }

  emits('delete', session.id)
}

function getSessionItemStateClass(sessionId: string) {
  return sessionId === props.activeSessionId ? 'active' : 'idle'
}
</script>

<template>
  <aside class="chat-session-sidebar">
    <div class="chat-session-sidebar__header">
      <span class="chat-session-sidebar__header-title">对话列表</span>
      <ElButton text circle size="small" @click="emits('create')">
        <SvgIcon category="ui" icon="plus" size="1rem" />
      </ElButton>
    </div>

    <div class="overflow-y-auto p-2">
      <div v-if="sessions.length === 0" class="chat-session-sidebar__empty">
        暂无对话
      </div>

      <div
        v-for="session in sessions"
        :key="session.id"
        class="chat-session-sidebar__item"
        :class="getSessionItemStateClass(session.id)"
        @click="emits('select', session.id)"
      >
        <SvgIcon category="ui" icon="chat" size="1rem" class="shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ session.title }}</span>
        <ElButton
          text
          circle
          size="small"
          class="chat-session-sidebar__delete-btn"
          @click.stop="confirmDelete(session)"
        >
          <SvgIcon category="ui" icon="trash" size="0.875rem" />
        </ElButton>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.chat-session-sidebar {
  flex-shrink: 0;
  width: 16rem;
  border-right: 1px solid color-mix(in srgb, var(--brand-border-base) 80%, transparent);
  background: var(--brand-bg-sidebar);

  .chat-session-sidebar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid color-mix(in srgb, var(--brand-border-base) 60%, transparent);
  }

  .chat-session-sidebar__header-title {
    color: var(--brand-text-primary);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .chat-session-sidebar__empty {
    padding: 1.5rem 0.75rem;
    color: color-mix(in srgb, var(--brand-text-secondary) 60%, transparent);
    font-size: 0.75rem;
    text-align: center;
  }

  .chat-session-sidebar__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 0.75rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease;

    &.active {
      border-color: color-mix(in srgb, var(--brand-primary) 10%, transparent);
      color: var(--brand-primary);
      background: color-mix(in srgb, var(--brand-primary) 6%, transparent);
      box-shadow:
        0 1px 2px 0 color-mix(in srgb, var(--brand-primary) 6%, transparent),
        0 1px 2px 0 color-mix(in srgb, var(--brand-text-primary) 5%, transparent);
    }

    &.idle {
      color: var(--brand-text-primary);

      &:hover {
        border-color: color-mix(in srgb, var(--brand-border-base) 70%, transparent);
        background: var(--brand-bg-surface-raised);
      }
    }
  }

  .chat-session-sidebar__delete-btn {
    width: 1.25rem !important;
    height: 1.25rem !important;
    opacity: 0;
    transition: opacity 0.2s ease, color 0.2s ease;

    &:hover {
      color: var(--brand-error);
    }
  }

  .chat-session-sidebar__item:hover .chat-session-sidebar__delete-btn,
  .chat-session-sidebar__delete-btn:focus {
    opacity: 1;
  }
}
</style>
