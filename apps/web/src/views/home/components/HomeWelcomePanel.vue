<script setup lang="ts">
import type { HomeOverviewModel } from '../typing'

defineProps<{
  overview: HomeOverviewModel
}>()
</script>

<template>
  <ElCard
    shadow="never"
    body-class="!p-8"
    class="home-welcome-card !rounded-[32px] !border-none overflow-hidden text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
  >
    <div class="flex flex-wrap items-start justify-between gap-6">
      <div class="max-w-2xl">
        <h1 class="text-4xl font-bold tracking-tight text-balance">
          {{ overview.title }}
        </h1>
        <p v-if="overview.description" class="mt-4 max-w-xl text-base leading-relaxed text-white/72">
          {{ overview.description }}
        </p>
      </div>

      <div class="rounded-[28px] border border-white/10 bg-white/8 px-5 py-4 backdrop-blur-sm">
        <div class="text-lg font-semibold text-white">
          {{ overview.dateLabel }}
        </div>
      </div>
    </div>
  </ElCard>
</template>

<style scoped lang="scss">
.home-welcome-card {
  background: linear-gradient(135deg, #101828 0%, #1f2937 50%, #334155 100%);
}
</style>
