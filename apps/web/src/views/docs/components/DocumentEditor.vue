<script setup lang="ts">
import type { DocumentEditorEmits, DocumentEditorProps } from '../typing'
import { DocumentBodyEditor, DocumentTitleEditor } from '@/components/tiptap-editor'

const props = defineProps<DocumentEditorProps>()
const emits = defineEmits<DocumentEditorEmits>()
</script>

<template>
  <section class="document-editor">
    <div class="document-editor__title">
      <DocumentTitleEditor
        class="document-editor__title-surface"
        :title="props.document.title"
        @update:title="emits('updateTitle', $event)"
      />
    </div>

    <div class="document-editor__body-frame">
      <div class="document-editor__body">
        <DocumentBodyEditor
          class="document-editor__body-surface"
          :content="props.document.body"
          @update:content="emits('updateContent', $event)"
          @content-error="emits('contentError', $event)"
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

  .document-editor__title {
    padding: 1rem;
    border-bottom: 1px solid color-mix(in srgb, var(--brand-border-base) 80%, transparent);
    background: var(--brand-bg-surface);
  }

  .document-editor__title-surface {
    min-height: auto;
  }

  .document-editor__body-frame {
    display: flex;
    flex: 1 1 0%;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem;
    background-image: radial-gradient(
      circle at top,
      color-mix(in srgb, var(--brand-primary) 3%, transparent) 0%,
      transparent 48%
    );
  }

  .document-editor__body {
    display: flex;
    flex: 1 1 0%;
    flex-direction: column;
    width: 100%;
    min-height: 0;
    margin-inline: auto;
  }

  .document-editor__body-surface {
    flex: 1 1 0%;
    min-height: 0;
  }
}
</style>
