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
      <DocumentBodyEditor
        :key="props.document.id"
        class="document-editor__body-editor"
        :document-id="props.document.id"
        :content="props.document.body"
        :active-block-id="props.activeBlockId"
        :editable="!isHistoryMode"
        @update:content="emits('updateContent', $event)"
        @content-error="emits('contentError', $event)"
        @request-comment="emits('requestComment', $event)"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.document-editor {
  --document-editor-content-max-width: 52rem;
  --document-editor-trailing-reserved-width: 3.75rem;
  --document-editor-inline-start: 1.75rem;
  --document-editor-inline-end: 1.25rem;
  --document-editor-content-inline-size: min(
    var(--document-editor-content-max-width),
    calc(100% - var(--document-editor-trailing-reserved-width))
  );
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
    padding: 1.625rem var(--document-editor-inline-end) 1rem var(--document-editor-inline-start);
    border-bottom: 1px solid color-mix(in srgb, var(--brand-border-base) 78%, transparent);
    background: inherit;

    &.is-history-mode {
      padding-bottom: 0.875rem;
      border-bottom-color: color-mix(in srgb, var(--brand-border-base) 62%, transparent);
    }
  }

  .document-editor__title-surface {
    --tiptap-content-min-height: auto;
    --tiptap-prosemirror-min-height: auto;
    --tiptap-prosemirror-height: auto;
    --tiptap-prosemirror-color: var(--brand-text-primary);
    --tiptap-prosemirror-font-size: 1.6rem;
    --tiptap-prosemirror-font-weight: 700;
    --tiptap-prosemirror-line-height: 1.2;
    --tiptap-prosemirror-letter-spacing: -0.02em;
    --tiptap-placeholder-color: var(--brand-text-placeholder);
    width: var(--document-editor-content-inline-size);
    max-width: 100%;
    min-height: auto;
    height: auto;
    margin-inline-end: auto;
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
    position: relative;
    display: flex;
    flex: 1 1 0%;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 0 2rem;
    background:
      radial-gradient(
        circle at top,
        color-mix(in srgb, var(--brand-primary) 3%, transparent) 0%,
        transparent 48%
      ),
      linear-gradient(
        180deg,
        transparent 0%,
        transparent calc(100% - 7rem),
        color-mix(in srgb, var(--brand-bg-surface) 95%, var(--brand-fill-lighter)) calc(100% - 3rem),
        color-mix(in srgb, var(--brand-bg-surface) 88%, var(--brand-fill-light)) 100%
      );

    &.is-history-mode {
      padding-top: 0.875rem;
      background:
        linear-gradient(
          180deg,
          transparent 0%,
          transparent calc(100% - 5rem),
          color-mix(in srgb, var(--brand-bg-surface) 95%, var(--brand-fill-lighter)) 100%
        );
    }
  }

  .document-editor__body-editor {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    flex: 1 0 auto;
    width: 100%;
    min-width: 0;
    min-height: 100%;
    padding-inline: var(--document-editor-inline-start) var(--document-editor-inline-end);
    box-sizing: border-box;

    :deep(.document-body-editor__surface) {
      grid-area: 1 / 1;
      flex: 1 1 0%;
      width: var(--document-editor-content-inline-size);
      max-width: 100%;
      min-width: 0;
      min-height: 0;
      margin-inline-end: auto;
    }
  }
}
</style>
