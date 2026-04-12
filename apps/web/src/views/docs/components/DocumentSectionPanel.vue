<script setup lang="ts">
import type {
  DocumentSectionPanelEmits,
  DocumentSectionPanelProps,
} from '../typing'
import { DOCUMENT_COLLECTION } from '@haohaoxue/samepage-contracts'
import { formatDocumentCollectionLabel } from '@haohaoxue/samepage-shared'
import { computed } from 'vue'
import DocumentItem from './DocumentItem.vue'
import DocumentToolbar from './DocumentToolbar.vue'

const props = defineProps<DocumentSectionPanelProps>()

const emit = defineEmits<DocumentSectionPanelEmits>()

const displayLabel = computed(() => formatDocumentCollectionLabel(props.group.id))

const chevronIconName = computed(() => {
  return props.isCollapsed ? 'chevron-right' : 'chevron-down'
})

function toggleSection() {
  return emit('toggleCollapse', props.group.id)
}
</script>

<template>
  <section class="document-tree-section">
    <div class="document-tree-section__header" @click="toggleSection">
      <div class="document-tree-section__header-main">
        <span class="text-xs font-medium tracking-[0.08em]">{{ displayLabel }}</span>
        <SvgIcon
          category="ui"
          :icon="chevronIconName"
          size="0.875rem"
          class="document-tree-section__chevron"
        />
      </div>

      <div
        v-if="group.id === DOCUMENT_COLLECTION.PERSONAL"
        class="document-tree-section__toolbar"
        @click.stop
      >
        <DocumentToolbar
          :is-busy="isActionPending"
          @create-root="emit('createRoot')"
        />
      </div>
    </div>

    <div v-if="!isCollapsed && group.nodes.length" class="space-y-0.5">
      <DocumentItem
        v-for="document in group.nodes"
        :key="document.id"
        :item="document"
        :collection-id="group.id"
        :depth="0"
        :active-document-id="activeDocumentId"
        :expanded-document-ids="expandedDocumentIds"
        :is-action-pending="isActionPending"
        @open="emit('open', $event)"
        @toggle="emit('toggle', $event)"
        @create-child="emit('createChild', $event)"
        @delete-document="emit('deleteDocument', $event)"
      />
    </div>

    <ElEmpty
      v-else-if="!isCollapsed"
      :image-size="48"
      description="暂无文档"
    />
  </section>
</template>

<style scoped lang="scss">
.document-tree-section {
  > .document-tree-section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding-block: 0.25rem;
    padding-inline: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      background: var(--brand-fill-light);
    }

    .document-tree-section__header-main {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      min-width: 0;
      color: var(--brand-text-secondary);
      flex: 1;
    }

    .document-tree-section__toolbar {
      flex-shrink: 0;
      cursor: default;
    }

    .document-tree-section__chevron {
      font-size: 0.875rem;
      opacity: 0;
      transform: translateX(-0.125rem);
      transition:
        opacity 0.2s ease,
        transform 0.2s ease;
    }

    &:hover .document-tree-section__chevron,
    &:focus-within .document-tree-section__chevron {
      opacity: 1;
      transform: translateX(0);
    }

    &:hover .document-tree-section__header-main {
      color: var(--brand-text-secondary);
    }
  }
}
</style>
