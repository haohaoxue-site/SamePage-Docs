<script setup lang="ts">
import type { DocumentTreeSectionId } from '@haohaoxue/samepage-domain'
import { computed, ref, watch } from 'vue'
import WorkspacePage from '@/layouts/components/WorkspacePage.vue'
import DocumentEditorPane from './components/DocumentEditorPane.vue'
import DocumentTreeSectionPanel from './components/DocumentTreeSectionPanel.vue'
import { useDocumentWorkspace } from './composables/useDocumentWorkspace'

const {
  treeSections,
  currentDocument,
  activeNodeId,
  breadcrumbLabels,
  expandedNodeIdSet,
  isTreeLoading,
  isDocumentLoading,
  isMutatingTree,
  saveStateLabel,
  openNode,
  toggleNode,
  createRootNode,
  createChildNode,
  deleteNode,
  updateDocumentTitle,
  updateDocumentContent,
} = useDocumentWorkspace()

const collapsedSectionIds = ref<DocumentTreeSectionId[]>(['personal', 'shared', 'team'])
const collapsedSectionIdSet = computed(() => new Set(collapsedSectionIds.value))
const visibleBreadcrumbLabels = computed(() => breadcrumbLabels.value.length > 1 ? breadcrumbLabels.value : [])

function toggleSectionCollapse(sectionId: DocumentTreeSectionId) {
  collapsedSectionIds.value = collapsedSectionIdSet.value.has(sectionId)
    ? collapsedSectionIds.value.filter(id => id !== sectionId)
    : [...collapsedSectionIds.value, sectionId]
}

watch(
  () => currentDocument.value?.section,
  (nextSectionId) => {
    if (!nextSectionId) {
      return
    }

    collapsedSectionIds.value = collapsedSectionIds.value.filter(id => id !== nextSectionId)
  },
)
</script>

<template>
  <WorkspacePage>
    <template #context>
      <div class="min-w-0">
        <ElBreadcrumb v-if="visibleBreadcrumbLabels.length" separator="/" class="min-w-0">
          <ElBreadcrumbItem
            v-for="label in visibleBreadcrumbLabels"
            :key="label"
          >
            <span class="truncate text-sm text-secondary">{{ label }}</span>
          </ElBreadcrumbItem>
        </ElBreadcrumb>

        <div
          v-if="currentDocument"
          class="mt-1 max-w-full truncate text-[11px] leading-5 text-secondary/75"
        >
          {{ saveStateLabel }}
        </div>
      </div>
    </template>

    <div class="flex h-full min-h-0">
      <aside class="w-full max-w-84 shrink-0 border-r border-border/80 bg-white">
        <div class="h-full overflow-y-auto px-3 py-4">
          <div v-if="isTreeLoading" class="px-3 py-6 text-sm text-secondary">
            正在加载文档树...
          </div>

          <div v-else class="space-y-6 pb-20">
            <DocumentTreeSectionPanel
              v-for="section in treeSections"
              :key="section.id"
              :section="section"
              :active-node-id="activeNodeId"
              :expanded-node-ids="expandedNodeIdSet"
              :is-collapsed="collapsedSectionIdSet.has(section.id)"
              :is-action-pending="isMutatingTree"
              @open="openNode"
              @toggle="toggleNode"
              @toggle-collapse="toggleSectionCollapse"
              @create-root="createRootNode"
              @create-child="createChildNode"
              @delete-node="deleteNode"
            />
          </div>
        </div>
      </aside>

      <DocumentEditorPane
        :document="currentDocument"
        :is-loading="isDocumentLoading"
        @update-title="updateDocumentTitle"
        @update-content="updateDocumentContent"
      />
    </div>
  </WorkspacePage>
</template>
