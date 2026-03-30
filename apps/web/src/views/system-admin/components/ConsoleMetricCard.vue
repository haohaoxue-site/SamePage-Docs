<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  detail: string
  icon?: string
}>()
</script>

<template>
  <ElCard shadow="hover" body-class="!p-5" class="group border-border/80 transition-all duration-300 hover:border-primary/40">
    <div class="flex items-start justify-between">
      <div class="space-y-1">
        <p class="text-[10px] font-bold uppercase tracking-wider text-secondary">
          {{ label }}
        </p>
        <div class="text-2xl font-bold text-main tracking-tight group-hover:text-primary transition-colors">
          {{ value }}
        </div>
      </div>
      <div v-if="icon" class="text-xl text-secondary/40 group-hover:text-primary transition-colors" :class="[icon]" />
    </div>
    <p class="mt-4 text-xs text-secondary leading-snug">
      {{ detail }}
    </p>
  </ElCard>
</template>
