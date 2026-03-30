<script setup lang="ts">
import type { HomeQuickActionItem } from '../typing'

defineProps<{
  actions: HomeQuickActionItem[]
}>()
</script>

<template>
  <ElCard shadow="never" body-class="!p-6" class="!rounded-[28px] border-border/80 shadow-sm">
    <div class="mb-5">
      <h3 class="text-lg font-semibold text-main">
        快速操作
      </h3>
    </div>

    <div class="grid gap-3">
      <RouterLink
        v-for="action in actions"
        :key="action.id"
        :to="action.to"
        class="group flex items-center gap-4 rounded-2xl border border-border/70 bg-#fafbff p-4 text-main no-underline transition-all hover:border-primary/25 hover:bg-white"
      >
        <div class="h-11 w-11 flex shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
          <div :class="action.icon" class="text-xl" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold">
            {{ action.title }}
          </div>
          <div v-if="action.description" class="mt-1 text-xs leading-relaxed text-secondary">
            {{ action.description }}
          </div>
        </div>
        <div class="i-carbon-arrow-up-right text-secondary transition group-hover:text-primary" />
      </RouterLink>
    </div>
  </ElCard>
</template>
