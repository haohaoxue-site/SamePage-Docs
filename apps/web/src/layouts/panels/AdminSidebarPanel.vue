<script setup lang="ts">
import type { AdminNavigationItem } from '@/layouts/types'
import { useAdminSession } from '@/layouts/composables/useAdminSession'

defineProps<{
  items: AdminNavigationItem[]
}>()

const { currentUser, isLoggingOut, logout } = useAdminSession()
</script>

<template>
  <aside
    class="w-72 h-screen flex flex-col border-r border-border bg-sidebar"
  >
    <div class="p-6 border-b border-border/50">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
          <div class="i-lucide-grid-3x3 text-lg" />
        </div>
        <div>
          <h1 class="text-sm font-bold text-main tracking-tight">
            System Console
          </h1>
          <p class="text-[10px] text-secondary font-medium uppercase tracking-wider">
            Management
          </p>
        </div>
      </div>
      <ElButton
        class="!w-full !rounded-lg !border-border !bg-white !text-xs !font-semibold hover:!bg-sidebar"
        @click="$router.push({ name: 'home' })"
      >
        <div class="i-carbon-chevron-left" />
        返回工作区
      </ElButton>
    </div>
    <ElScrollbar class="flex-1">
      <nav class="px-4 py-6 space-y-1">
        <RouterLink
          v-for="item in items"
          :key="item.id"
          class="flex flex-col px-3 py-2.5 rounded-lg transition-colors group"
          active-class="bg-primary/5! border-primary/10!"
          :to="{ name: item.routeName }"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-main group-hover:text-primary transition-colors">
              {{ item.label }}
            </span>
            <div class="i-carbon-chevron-right text-xs opacity-0 group-hover:opacity-40 transition-opacity" />
          </div>
          <p class="text-[11px] text-secondary mt-1 leading-normal">
            {{ item.description }}
          </p>
        </RouterLink>
      </nav>
    </ElScrollbar>

    <div
      v-if="currentUser"
      class="p-6 border-t border-border mt-auto bg-white/50"
    >
      <div class="flex items-center gap-3 mb-4">
        <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
          {{ currentUser.displayName.slice(0, 1) }}
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-bold text-main truncate">{{ currentUser.displayName }}</span>
          <span class="text-[11px] text-secondary truncate">{{ currentUser.email || '未绑定邮箱' }}</span>
        </div>
      </div>
      <ElButton
        plain
        type="danger"
        class="!w-full !rounded-lg !text-xs !font-semibold"
        :disabled="isLoggingOut"
        @click="logout"
      >
        <div v-if="isLoggingOut" class="i-carbon-progress-bar-round animate-spin" />
        <div v-else class="i-carbon-logout" />
        退出登录
      </ElButton>
    </div>
  </aside>
</template>
