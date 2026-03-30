<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useWorkspaceShell } from '@/layouts/composables/useWorkspaceShell'
import WorkspaceSidebarPanel from '@/layouts/panels/WorkspaceSidebarPanel.vue'

const { navigationItems, isSidebarCollapsed, toggleSidebar } = useWorkspaceShell()
</script>

<template>
  <div class="h-screen flex overflow-hidden bg-#eef1f6 font-sans text-main">
    <WorkspaceSidebarPanel
      :navigation-items="navigationItems"
      :is-collapsed="isSidebarCollapsed"
      @toggle="toggleSidebar"
    />

    <main class="min-w-0 flex-1 overflow-hidden border-l border-white/60 bg-white shadow-[0_20px_60px_rgba(31,35,41,0.06)]">
      <RouterView />
    </main>
  </div>
</template>
