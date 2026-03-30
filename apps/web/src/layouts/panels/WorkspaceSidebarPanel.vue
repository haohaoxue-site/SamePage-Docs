<script setup lang="ts">
import type { WorkspaceNavigationItem } from '@/layouts/types'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{
  navigationItems: WorkspaceNavigationItem[]
  isCollapsed: boolean
}>()

defineEmits<{
  toggle: []
}>()

const route = useRoute()

function isActive(item: WorkspaceNavigationItem) {
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

const containerClasses = computed(() => props.isCollapsed
  ? 'w-22 px-3'
  : 'w-72 px-4')
</script>

<template>
  <aside
    class="h-screen shrink-0 border-r border-border/80 bg-#f6f7fb transition-all duration-300 ease-out"
    :class="containerClasses"
  >
    <div class="flex h-full flex-col py-4">
      <div class="flex items-center justify-between gap-3 px-2 pb-4">
        <RouterLink to="/home" class="min-w-0 flex items-center gap-3 text-main no-underline">
          <div class="h-11 w-11 flex shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shadow-primary/20">
            <div class="i-carbon-collaborate text-xl" />
          </div>
          <div v-if="!props.isCollapsed" data-testid="workspace-brand" class="min-w-0">
            <div class="truncate text-sm font-bold tracking-tight">
              SamePage
            </div>
            <div class="truncate text-xs text-secondary">
              Workspace
            </div>
          </div>
        </RouterLink>

        <ElButton
          text
          class="!h-9 !w-9 !rounded-xl !border !border-border/70 !bg-white !p-0 !text-secondary hover:!border-primary/30 hover:!text-primary"
          :title="props.isCollapsed ? '展开导航' : '收起导航'"
          @click="$emit('toggle')"
        >
          <div :class="props.isCollapsed ? 'i-carbon-side-panel-open' : 'i-carbon-side-panel-close'" class="text-lg" />
        </ElButton>
      </div>

      <ElScrollbar class="flex-1 pt-4">
        <nav class="space-y-2 pr-1">
          <RouterLink
            v-for="item in props.navigationItems"
            :key="item.id"
            :to="item.to"
            class="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-secondary no-underline transition-all"
            :class="isActive(item)
              ? 'border-primary/10 bg-white text-primary shadow-sm'
              : 'hover:border-border/80 hover:bg-white/75 hover:text-main'"
            :title="props.isCollapsed ? item.label : undefined"
          >
            <div
              class="h-11 w-11 flex shrink-0 items-center justify-center rounded-2xl transition-colors"
              :class="isActive(item) ? 'bg-primary/10 text-primary' : 'bg-white text-secondary group-hover:text-main'"
            >
              <div :class="item.icon" class="text-xl" />
            </div>

            <div v-if="!props.isCollapsed" class="min-w-0">
              <div class="truncate text-sm font-semibold">
                {{ item.label }}
              </div>
              <div v-if="item.description" class="truncate text-xs text-secondary">
                {{ item.description }}
              </div>
            </div>
          </RouterLink>
        </nav>
      </ElScrollbar>
    </div>
  </aside>
</template>
