<script setup lang="ts">
import type { WorkspaceContextUser } from '@/layouts/types'
import { computed } from 'vue'
import { useAuthSession } from '@/layouts/composables/useAuthSession'

const { currentUser: sessionUser, isLoggingOut, logout } = useAuthSession()
const secondaryMenuActions = [
  { label: '设置', icon: 'i-carbon-settings' },
  { label: '外观', icon: 'i-carbon-paint-brush' },
] as const

const currentUser = computed<WorkspaceContextUser>(() => {
  const user = sessionUser.value

  if (!user) {
    return {
      displayName: '未登录用户',
      email: 'samepage.local',
      avatarUrl: null,
      initial: 'U',
    }
  }

  return {
    displayName: user.displayName,
    email: user.email || '未绑定邮箱',
    avatarUrl: user.avatarUrl,
    initial: user.displayName.trim().slice(0, 1).toUpperCase() || 'U',
  }
})
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-border/80 bg-white/92 px-6 py-4 backdrop-blur-xl">
    <div class="flex items-center gap-4">
      <div class="min-w-0 flex-1">
        <slot name="context" />
      </div>

      <ElPopover
        trigger="click"
        placement="bottom-end"
        :offset="14"
        :show-arrow="false"
        :teleported="false"
        popper-class="workspace-user-popover"
      >
        <template #reference>
          <ElButton
            circle
            class="workspace-avatar-trigger !h-10 !w-10 !overflow-hidden !border-border/80 !bg-white !p-0 hover:!border-primary/20 hover:!bg-white"
          >
            <img
              v-if="currentUser.avatarUrl"
              :src="currentUser.avatarUrl"
              :alt="`${currentUser.displayName} 的头像`"
              class="h-full w-full object-cover"
            >
            <div
              v-else
              class="h-full w-full flex items-center justify-center bg-primary/10 text-sm font-bold text-primary"
            >
              {{ currentUser.initial }}
            </div>
          </ElButton>
        </template>

        <div class="workspace-user-menu">
          <div class="flex items-start gap-3 px-4 py-4">
            <img
              v-if="currentUser.avatarUrl"
              :src="currentUser.avatarUrl"
              :alt="`${currentUser.displayName} 的头像`"
              class="h-12 w-12 shrink-0 rounded-full object-cover"
            >
            <div
              v-else
              class="h-12 w-12 flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
            >
              {{ currentUser.initial }}
            </div>

            <div class="min-w-0 flex-1 pt-1">
              <div class="truncate text-[15px] font-semibold text-main">
                {{ currentUser.displayName }}
              </div>
              <div class="truncate pt-1 text-sm text-secondary">
                {{ currentUser.email }}
              </div>
            </div>
          </div>

          <div class="mx-4 mb-3 flex items-center gap-2 rounded-2xl bg-#f7f9fc px-3 py-2.5 text-sm text-secondary">
            <div class="i-carbon-chat text-base" />
            <span class="truncate">我可能回复稍慢。</span>
          </div>

          <ElDivider class="!my-0" />

          <div class="flex flex-col gap-1 px-2 py-2">
            <ElButton
              v-for="action in secondaryMenuActions"
              :key="action.label"
              text
              class="workspace-user-menu-item !ml-0"
            >
              <div class="flex items-center gap-3">
                <div :class="action.icon" class="text-base text-secondary" />
                <span>{{ action.label }}</span>
              </div>
            </ElButton>
          </div>

          <ElDivider class="!my-0" />

          <div class="flex flex-col gap-1 px-2 py-2">
            <ElButton
              text
              class="workspace-user-menu-item !ml-0 !text-#d14343"
              :disabled="isLoggingOut"
              @click="logout"
            >
              <div class="flex items-center gap-3">
                <div
                  :class="isLoggingOut ? 'i-carbon-progress-bar-round animate-spin' : 'i-carbon-logout'"
                  class="text-base"
                />
                <span>{{ isLoggingOut ? '退出中...' : '退出登录' }}</span>
              </div>
            </ElButton>
          </div>
        </div>
      </ElPopover>
    </div>
  </header>
</template>

<style scoped lang="scss">
:deep(.workspace-user-popover.el-popover) {
  min-width: 320px;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.workspace-user-menu {
  overflow: hidden;
  border: 1px solid rgba(205, 214, 228, 0.85);
  border-radius: 1.5rem;
  background: #fff;
  box-shadow: 0 24px 60px rgba(31, 35, 41, 0.12);
}

.workspace-user-menu-item {
  margin-left: 0;
  width: 100%;
  min-height: 2.75rem;
  justify-content: flex-start;
  border-radius: 1rem;
  padding-inline: 0.75rem;
  color: #1f2329;

  &:hover {
    background: #f5f7fb;
    color: #1f2329;
  }

  :deep(.el-button__content) {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
