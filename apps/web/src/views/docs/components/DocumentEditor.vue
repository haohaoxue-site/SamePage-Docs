<script setup lang="ts">
import type { DocumentEditorEmits, DocumentEditorProps } from '../typing'
import { DocumentBodyEditor, DocumentTitleEditor } from '@/components/tiptap-editor'
import { useDocumentEditor } from '../composables/useDocumentEditor'

const props = defineProps<DocumentEditorProps>()
const emits = defineEmits<DocumentEditorEmits>()
const { isHistoryMode } = useDocumentEditor(props)
</script>

<template>
  <section class="document-editor" :class="{ 'is-history-mode': isHistoryMode }">
    <div class="document-editor__title" :class="{ 'is-history-mode': isHistoryMode }">
      <DocumentTitleEditor
        class="document-editor__title-surface"
        :title="props.document.title"
        :editable="!isHistoryMode"
        @update:title="emits('updateTitle', $event)"
      />

      <div v-if="isHistoryMode" class="document-editor__compact-meta">
        <SvgIcon category="ui" icon="info" size="13px" />
        <span>文档信息</span>
      </div>
    </div>

    <div class="document-editor__body-frame" :class="{ 'is-history-mode': isHistoryMode }">
      <div class="document-editor__body">
        <DocumentBodyEditor
          :key="props.document.id"
          class="document-editor__body-surface"
          :document-id="props.document.id"
          :content="props.document.body"
          :editable="!isHistoryMode"
          @update:content="emits('updateContent', $event)"
          @content-error="emits('contentError', $event)"
          @request-comment="emits('requestComment', $event)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.document-editor {
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  min-height: 0;
  background: var(--brand-bg-surface);

  &.is-history-mode {
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--brand-primary) 3%, white 97%) 0%,
        var(--brand-bg-surface) 24%
      );
  }

  .document-editor__title {
    padding: 1.625rem 1.75rem 1rem;
    border-bottom: 1px solid color-mix(in srgb, var(--brand-border-base) 78%, transparent);
    background: inherit;

    &.is-history-mode {
      padding-bottom: 0.875rem;
      border-bottom-color: color-mix(in srgb, var(--brand-border-base) 62%, transparent);
    }
  }

  .document-editor__title-surface {
    min-height: auto;
  }

  .document-editor__compact-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.625rem;
    padding: 0.125rem 0.375rem 0.125rem 0;
    color: color-mix(in srgb, var(--brand-text-secondary) 82%, transparent);
    font-size: 12px;
    font-weight: 500;
  }

  .document-editor__body-frame {
    display: flex;
    flex: 1 1 0%;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 1.75rem 2rem;
    background-image: radial-gradient(
      circle at top,
      color-mix(in srgb, var(--brand-primary) 3%, transparent) 0%,
      transparent 48%
    );

    &.is-history-mode {
      padding-top: 0.875rem;
      background-image: none;
    }
  }

  .document-editor__body {
    display: flex;
    flex: 1 1 0%;
    flex-direction: column;
    width: min(100%, 52rem);
    min-height: 0;
    margin-inline: auto;
  }

  .document-editor__body-surface {
    flex: 1 1 0%;
    min-height: 0;
  }
}
</style>
