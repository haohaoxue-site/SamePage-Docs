<script setup lang="ts">
import { RouterView } from 'vue-router'
import SessionUserMenu from '@/layouts/components/SessionUserMenu.vue'
import { useAdminShell } from '@/layouts/composables/useAdminShell'
import AdminSidebarPanel from '@/layouts/panels/AdminSidebarPanel.vue'

const { navigationItems, pageHeader } = useAdminShell()
</script>

<template>
  <div class="admin-shell">
    <AdminSidebarPanel :items="navigationItems" />

    <main class="admin-shell__main">
      <div class="admin-shell__scroll">
        <header class="admin-shell__header">
          <div class="admin-shell__header-inner">
            <div class="admin-shell__header-layout">
              <div class="admin-shell__header-copy">
                <h1 class="admin-shell__title">
                  {{ pageHeader.title }}
                </h1>
                <p class="admin-shell__description">
                  {{ pageHeader.description }}
                </p>
              </div>

              <div class="admin-shell__user-menu">
                <SessionUserMenu />
              </div>
            </div>
          </div>
        </header>
        <section class="admin-shell__content">
          <RouterView />
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.admin-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--brand-fill-light);
  color: var(--brand-text-primary);
  font-family: var(--el-font-family);

  .admin-shell__main {
    position: relative;
    display: flex;
    flex: 1 1 0%;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .admin-shell__scroll {
    flex: 1 1 0%;
    overflow-y: auto;
    background: var(--brand-fill-lighter);
  }

  .admin-shell__header {
    padding: 2.5rem 2rem;
    border-bottom: 1px solid var(--brand-border-base);
    background: var(--brand-bg-surface);
  }

  .admin-shell__header-inner,
  .admin-shell__content {
    max-width: 80rem;
    margin-inline: auto;
  }

  .admin-shell__header-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
    }
  }

  .admin-shell__header-copy {
    > * + * {
      margin-top: 1rem;
    }
  }

  .admin-shell__title {
    color: var(--brand-text-primary);
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.025em;

    @media (min-width: 768px) {
      font-size: 3rem;
    }
  }

  .admin-shell__description {
    max-width: 42rem;
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
    line-height: 1.625;
  }

  .admin-shell__user-menu {
    display: flex;
    justify-content: flex-end;

    @media (min-width: 768px) {
      padding-top: 0.25rem;
    }
  }

  .admin-shell__content {
    padding: 0 2rem 3rem;
  }
}
</style>
