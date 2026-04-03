<script setup lang="ts">
import SessionUserMenu from './SessionUserMenu.vue'
</script>

<template>
  <header class="workspace-context-bar">
    <div class="workspace-context-bar__content">
      <div class="workspace-context-bar__slot">
        <slot name="context" />
      </div>

      <SessionUserMenu />
    </div>
  </header>
</template>

<style scoped lang="scss">
.workspace-context-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--brand-border-base) 80%, transparent);
  backdrop-filter: blur(24px);
  background: var(--brand-bg-overlay);

  .workspace-context-bar__content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .workspace-context-bar__slot {
    flex: 1 1 0%;
    min-width: 0;
  }
}
</style>
