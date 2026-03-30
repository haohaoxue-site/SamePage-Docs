<script setup lang="ts">
import type { HomeScheduleItem } from '../typing'

defineProps<{
  schedules: HomeScheduleItem[]
}>()
</script>

<template>
  <ElCard shadow="never" body-class="!p-6" class="!rounded-[28px] border-border/80 shadow-sm">
    <div class="mb-5">
      <h3 class="text-lg font-semibold text-main">
        日程
      </h3>
    </div>

    <div class="space-y-3">
      <article
        v-for="item in schedules"
        :key="item.id"
        class="flex items-start gap-4 rounded-2xl border border-border/70 bg-#fafbff p-4"
      >
        <div class="rounded-2xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          {{ item.timeLabel }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-main">
            {{ item.title }}
          </div>
          <div v-if="item.description" class="mt-1 text-xs leading-relaxed text-secondary">
            {{ item.description }}
          </div>
        </div>
      </article>
    </div>
  </ElCard>
</template>
