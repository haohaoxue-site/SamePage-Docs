<script setup lang="ts">
import type { SharedDocumentReaderPageProps } from '../typing'
import DocumentEditor from '@/views/docs/components/DocumentEditor.vue'

const props = defineProps<SharedDocumentReaderPageProps>()
</script>

<template>
  <section class="shared-document-reader-page">
    <header class="shared-document-reader-page__header">
      <div class="shared-document-reader-page__meta">
        <div class="shared-document-reader-page__eyebrow">
          独立阅读页
        </div>

        <div class="shared-document-reader-page__summary">
          {{ props.access.workspaceType === 'TEAM' ? '团队空间' : '我的空间' }} · {{ props.access.workspaceName }}
        </div>
      </div>

      <div class="shared-document-reader-page__badge">
        只读访问
      </div>
    </header>

    <div class="shared-document-reader-page__surface">
      <DocumentEditor
        :document="props.document"
        :metadata="props.metadata"
        mode="readonly"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.shared-document-reader-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  flex: 1 1 0%;
  min-height: 0;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--brand-primary) 4%, white) 0%,
      var(--brand-bg-base) 18%,
      var(--brand-bg-base) 100%
    );

  .shared-document-reader-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.5rem 0.75rem;
  }

  .shared-document-reader-page__meta {
    display: grid;
    gap: 0.25rem;
  }

  .shared-document-reader-page__eyebrow {
    color: var(--brand-primary);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .shared-document-reader-page__summary {
    color: var(--brand-text-secondary);
    font-size: 0.9rem;
  }

  .shared-document-reader-page__badge {
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--brand-primary) 10%, white);
    color: var(--brand-primary);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .shared-document-reader-page__surface {
    min-height: 0;
    padding: 0 1rem 1rem;

    :deep(.document-editor) {
      border: 1px solid color-mix(in srgb, var(--brand-border-base) 76%, transparent);
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 18px 48px -36px rgba(31, 35, 41, 0.32);
    }
  }
}
</style>
