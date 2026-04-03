<script setup lang="ts">
import type { AdminNavigationItem } from '@/layouts/typing'
import { useRoute } from 'vue-router'

const props = defineProps<{
  items: AdminNavigationItem[]
}>()

const route = useRoute()

function isActive(item: AdminNavigationItem) {
  return route.name === item.routeName
}

function getItemStateClass(item: AdminNavigationItem) {
  return isActive(item) ? 'active' : 'idle'
}
</script>

<template>
  <aside class="admin-sidebar">
    <div class="border-b border-border-a60 px-4 py-4">
      <RouterLink
        to="/admin"
        class="admin-sidebar__brand"
      >
        <div class="admin-sidebar__brand-mark">
          <SvgIcon category="nav" icon="workspace" size="2.75rem" />
        </div>
        <div class="min-w-0">
          <div class="truncate text-sm font-bold tracking-tight">
            SamePage Console
          </div>
          <div class="truncate text-xs text-secondary">
            System Admin
          </div>
        </div>
      </RouterLink>
    </div>

    <ElScrollbar class="flex-1">
      <nav class="space-y-2 px-4 py-5">
        <RouterLink
          v-for="item in props.items"
          :key="item.routeName"
          :to="item.path"
          class="admin-sidebar__nav-item"
          :class="getItemStateClass(item)"
        >
          <div class="flex items-center justify-between">
            <span class="admin-sidebar__item-label" :class="getItemStateClass(item)">
              {{ item.label }}
            </span>
            <div class="admin-sidebar__item-chevron" :class="getItemStateClass(item)" />
          </div>
          <p class="mt-1 text-[11px] leading-normal text-secondary">
            {{ item.description }}
          </p>
        </RouterLink>
      </nav>
    </ElScrollbar>
  </aside>
</template>

<style scoped lang="scss">
.admin-sidebar {
  display: flex;
  flex-direction: column;
  width: 18rem;
  height: 100vh;
  border-right: 1px solid color-mix(in srgb, var(--brand-border-base) 80%, transparent);
  background: var(--brand-bg-sidebar);

  .admin-sidebar__brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    padding: 0.5rem;
    border-radius: 1rem;
    color: var(--brand-text-primary);
    text-decoration: none;
  }

  .admin-sidebar__brand-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.75rem;
    height: 2.75rem;
  }

  .admin-sidebar__nav-item {
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
    border: 1px solid transparent;
    border-radius: 1rem;
    color: var(--brand-text-secondary);
    text-decoration: none;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease;

    &.active {
      border-color: color-mix(in srgb, var(--brand-primary) 10%, transparent);
      color: var(--brand-primary);
      background: var(--brand-bg-surface);
      box-shadow: 0 1px 2px 0 color-mix(in srgb, var(--brand-text-primary) 5%, transparent);
    }

    &.idle {
      &:hover {
        border-color: color-mix(in srgb, var(--brand-border-base) 80%, transparent);
        color: var(--brand-text-primary);
        background: var(--brand-bg-surface-raised);
      }
    }
  }

  .admin-sidebar__item-label {
    font-size: 0.875rem;
    font-weight: 600;
    transition: color 0.2s ease;

    &.active {
      color: var(--brand-primary);
    }

    &.idle {
      color: var(--brand-text-primary);
    }
  }

  .admin-sidebar__nav-item.idle:hover {
    .admin-sidebar__item-label.idle {
      color: var(--brand-primary);
    }
  }

  .admin-sidebar__item-chevron {
    font-size: 0.75rem;
    transition:
      opacity 0.2s ease,
      color 0.2s ease;

    &.active {
      opacity: 0.6;
      color: var(--brand-primary);
    }

    &.idle {
      opacity: 0;
    }
  }

  .admin-sidebar__nav-item.idle:hover {
    .admin-sidebar__item-chevron.idle {
      opacity: 0.4;
    }
  }
}
</style>
