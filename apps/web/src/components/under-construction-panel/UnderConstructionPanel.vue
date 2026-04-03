<script setup lang="ts">
import type { UnderConstructionPanelProps } from './typing'

defineProps<UnderConstructionPanelProps>()
</script>

<template>
  <section class="under-construction-panel">
    <ElCard
      shadow="never"
      class="under-construction-panel__card"
    >
      <ElResult :title="title" :sub-title="description">
        <template #icon>
          <div class="under-construction-panel__icon-shell">
            <SvgIcon
              v-if="icon"
              :category="iconCategory"
              :icon="icon"
              size="2.25rem"
              class="under-construction-panel__icon-symbol"
            />
          </div>
        </template>
      </ElResult>
    </ElCard>
  </section>
</template>

<style scoped lang="scss">
.under-construction-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 64rem;
  height: 100%;
  min-height: 30rem;
  margin-inline: auto;
  padding: 2.5rem 1.5rem;

  .under-construction-panel__card {
    width: 100%;
    max-width: 48rem;
    border-color: color-mix(in srgb, var(--brand-border-base) 80%, transparent);
    border-radius: 2rem !important;
    background-image: linear-gradient(
      135deg,
      #fff 0%,
      #f9fafc 48%,
      #f2f6ff 100%
    );
    box-shadow: 0 20px 60px rgba(31, 35, 41, 0.06);
  }

  .under-construction-panel__icon-shell {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 4rem;
    height: 4rem;
    border-radius: 24px;
    color: var(--brand-primary);
    background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
  }

  .under-construction-panel__icon-symbol {
    display: block;
  }
}
</style>
