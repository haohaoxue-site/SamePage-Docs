<script setup lang="ts">
import WorkspacePage from '@/layouts/components/WorkspacePage.vue'
</script>

<template>
  <WorkspacePage>
    <template #context>
      <div class="knowledge-view-context">
        <div class="knowledge-view-context__title">
          知识库
        </div>
      </div>
    </template>

    <section class="knowledge-view-placeholder">
      <div class="knowledge-view-placeholder__icon">
        <SvgIcon category="nav" icon="knowledge-active" size="4rem" />
      </div>
      <div class="knowledge-view-placeholder__title">
        知识库正在建设中
      </div>
    </section>
  </WorkspacePage>
</template>

<style scoped lang="scss">
.knowledge-view-context {
  .knowledge-view-context__title {
    color: var(--brand-text-primary);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 2rem;
  }
}

.knowledge-view-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  box-sizing: border-box;
  min-height: 100%;
  padding: 3rem 1.5rem;
  text-align: center;

  .knowledge-view-placeholder__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5.5rem;
    height: 5.5rem;
    border: 1px solid color-mix(in srgb, var(--brand-primary) 16%, transparent);
    border-radius: 1.75rem;
    background:
      radial-gradient(circle at top, rgba(255, 255, 255, 0.92), transparent 58%),
      linear-gradient(160deg, #f3fffa 0%, #effbf6 42%, #f8ffed 100%);
    box-shadow: 0 20px 44px rgba(52, 114, 88, 0.12);
  }

  .knowledge-view-placeholder__title {
    color: var(--brand-text-primary);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 2rem;
  }
}
</style>
