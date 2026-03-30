<script setup lang="ts">
import type { HomeRecentDocument } from '../typing'

defineProps<{
  documents: HomeRecentDocument[]
}>()

function formatDocumentUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}
</script>

<template>
  <ElCard shadow="never" body-class="!p-6" class="!rounded-[28px] border-border/80 shadow-sm">
    <div class="mb-5 flex items-center justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold text-main">
          最近文档
        </h3>
      </div>
      <ElTag effect="plain" round size="small">
        {{ documents.length }} 篇文档
      </ElTag>
    </div>

    <div v-if="documents.length" class="grid gap-3">
      <RouterLink
        v-for="document in documents"
        :key="document.id"
        :to="{ name: 'docs', params: { id: document.id } }"
        class="group flex items-start gap-4 rounded-2xl border border-border/70 bg-#fbfcff p-4 text-main no-underline transition-all hover:border-primary/25 hover:bg-white"
      >
        <div class="h-11 w-11 flex shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <div class="i-carbon-document text-lg" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="min-w-0 flex-1 truncate text-sm font-semibold text-main">
              {{ document.title }}
            </h4>
            <span class="text-xs text-secondary">
              更新于 {{ formatDocumentUpdatedAt(document.updatedAt) }}
            </span>
          </div>
          <p v-if="document.summary" class="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">
            {{ document.summary }}
          </p>
        </div>
      </RouterLink>
    </div>

    <ElEmpty v-else description="暂无内容" />
  </ElCard>
</template>
