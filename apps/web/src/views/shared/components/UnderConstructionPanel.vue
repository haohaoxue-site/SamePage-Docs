<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon: string
}>()
</script>

<template>
  <section class="mx-auto flex h-full min-h-120 max-w-5xl items-center justify-center px-6 py-10">
    <ElCard
      shadow="never"
      class="w-full max-w-3xl !rounded-[32px] border-border/80 bg-linear-to-br from-white via-#f9fafc to-#f2f6ff shadow-[0_20px_60px_rgba(31,35,41,0.06)]"
    >
      <ElResult :title="title" :sub-title="description">
        <template #icon>
          <div class="h-16 w-16 flex shrink-0 items-center justify-center rounded-[24px] bg-primary/10 text-primary">
            <div :class="icon" class="text-3xl" />
          </div>
        </template>
      </ElResult>
    </ElCard>
  </section>
</template>
