<script setup lang="ts">
import type { HomeActivityItem } from '../typing'

defineProps<{
  activities: HomeActivityItem[]
}>()
</script>

<template>
  <ElCard shadow="never" body-class="!p-6" class="!rounded-[28px] border-border/80 shadow-sm">
    <div class="mb-5">
      <h3 class="text-lg font-semibold text-main">
        最近活动
      </h3>
    </div>

    <div class="space-y-4">
      <article
        v-for="activity in activities"
        :key="activity.id"
        class="relative border-l border-border/80 pl-5"
      >
        <div class="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
        <div class="text-sm font-semibold text-main">
          {{ activity.title }}
        </div>
        <div v-if="activity.description" class="mt-1 text-xs leading-relaxed text-secondary">
          {{ activity.description }}
        </div>
        <div class="mt-2 text-[11px] font-medium text-primary/80">
          {{ activity.timeLabel }}
        </div>
      </article>
    </div>
  </ElCard>
</template>
