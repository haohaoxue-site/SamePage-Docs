<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAdminShell } from '@/layouts/composables/useAdminShell'
import AdminSidebarPanel from '@/layouts/panels/AdminSidebarPanel.vue'

const { navigationItems, pageHeader } = useAdminShell()
</script>

<template>
  <div class="flex h-screen bg-white overflow-hidden font-sans text-main">
    <AdminSidebarPanel :items="navigationItems" />

    <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <div class="flex-1 overflow-y-auto bg-[#fafafa]">
        <header class="bg-white border-b border-border px-8 py-10">
          <div class="max-w-6xl mx-auto">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div class="space-y-4">
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/5 px-2 py-1 rounded">
                  {{ pageHeader.eyebrow }}
                </span>
                <h1 class="text-4xl md:text-5xl font-bold text-main tracking-tight leading-none">
                  {{ pageHeader.title }}
                </h1>
                <p class="text-sm text-secondary max-w-2xl leading-relaxed">
                  {{ pageHeader.description }}
                </p>
              </div>
            </div>
          </div>
        </header>
        <section class="max-w-6xl mx-auto px-8 pb-12">
          <RouterView />
        </section>
      </div>
    </main>
  </div>
</template>
