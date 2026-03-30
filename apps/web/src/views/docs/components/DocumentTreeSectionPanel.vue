<script setup lang="ts">
import type { DocumentTreeSection, DocumentTreeSectionId } from '@haohaoxue/samepage-domain'
import { computed } from 'vue'
import DocumentTreeNodeItem from './DocumentTreeNodeItem.vue'
import DocumentTreeToolbar from './DocumentTreeToolbar.vue'

const props = defineProps<{
  section: DocumentTreeSection
  activeNodeId: string | null
  expandedNodeIds: Set<string>
  isCollapsed: boolean
  isActionPending: boolean
}>()

defineEmits<{
  open: [nodeId: string]
  toggle: [nodeId: string]
  toggleCollapse: [sectionId: DocumentTreeSectionId]
  createRoot: []
  createChild: [nodeId: string]
  deleteNode: [nodeId: string]
}>()

const displayLabel = computed(() => {
  if (props.section.id === 'personal') {
    return '私有'
  }

  if (props.section.id === 'shared') {
    return '共享'
  }

  return '团队'
})
</script>

<template>
  <section>
    <div class="group mb-2 flex items-center justify-between gap-2 rounded-lg px-2 hover:bg-#f7f8fb">
      <ElButton
        text
        class="!h-auto !rounded-none !px-0 !py-1 !text-secondary hover:!bg-transparent hover:!text-secondary focus:!bg-transparent active:!bg-transparent"
        @click="$emit('toggleCollapse', section.id)"
      >
        <span class="text-xs font-medium tracking-[0.08em]">{{ displayLabel }}</span>
        <div
          class="ml-1 text-sm opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100"
          :class="isCollapsed ? 'i-carbon-chevron-right' : 'i-carbon-chevron-down'"
        />
      </ElButton>

      <DocumentTreeToolbar
        v-if="section.id === 'personal'"
        :is-busy="isActionPending"
        @create-root="$emit('createRoot')"
      />
    </div>

    <div v-if="!isCollapsed && section.nodes.length" class="space-y-0.5">
      <DocumentTreeNodeItem
        v-for="node in section.nodes"
        :key="node.id"
        :node="node"
        :section-id="section.id"
        :depth="0"
        :active-node-id="activeNodeId"
        :expanded-node-ids="expandedNodeIds"
        :is-action-pending="isActionPending"
        @open="$emit('open', $event)"
        @toggle="$emit('toggle', $event)"
        @create-child="$emit('createChild', $event)"
        @delete-node="$emit('deleteNode', $event)"
      />
    </div>

    <ElEmpty
      v-else-if="!isCollapsed"
      :image-size="48"
      description="暂无文档"
    />
  </section>
</template>
