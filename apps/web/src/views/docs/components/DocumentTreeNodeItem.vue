<script setup lang="ts">
import type { DocumentTreeNode, DocumentTreeSectionId } from '@haohaoxue/samepage-domain'
import { computed } from 'vue'

type NodeActionCommand = 'collapse' | 'delete' | 'expand'

const props = defineProps<{
  node: DocumentTreeNode
  sectionId: DocumentTreeSectionId
  depth: number
  activeNodeId: string | null
  expandedNodeIds: Set<string>
  isActionPending: boolean
}>()

const emit = defineEmits<{
  open: [nodeId: string]
  toggle: [nodeId: string]
  createChild: [nodeId: string]
  deleteNode: [nodeId: string]
}>()

const isActive = computed(() => props.activeNodeId === props.node.id)
const isExpanded = computed(() => props.expandedNodeIds.has(props.node.id))
const canManageNode = computed(() => props.sectionId === 'personal')
const hasMoreActions = computed(() => props.node.hasChildren || canManageNode.value)

function handleActionCommand(command: NodeActionCommand) {
  if (command === 'delete') {
    emit('deleteNode', props.node.id)
    return
  }

  emit('toggle', props.node.id)
}
</script>

<template>
  <div class="document-tree-node-item" :style="{ paddingLeft: `${depth * 18}px` }">
    <div
      class="document-tree-node-item-surface group flex items-center gap-0.5 rounded-lg border border-transparent px-1 py-px transition-colors"
      :class="isActive
        ? 'document-tree-node-item-active bg-#f5f8ff text-#2f63d9 border-#cddcff shadow-sm shadow-primary/6'
        : 'hover:bg-#f7f8fb'"
    >
      <ElButton
        text
        class="!ml-0 !h-6 !w-6 !rounded-md !p-0 !text-secondary disabled:!opacity-30"
        :class="isActive
          ? '!text-#2f63d9 hover:!bg-transparent hover:!text-#2f63d9 focus:!bg-transparent active:!bg-transparent'
          : 'hover:!bg-white hover:!text-primary'"
        :disabled="!props.node.hasChildren"
        @click="emit('toggle', props.node.id)"
      >
        <div
          :class="props.node.hasChildren
            ? isExpanded
              ? 'i-carbon-chevron-down'
              : 'i-carbon-chevron-right'
            : 'i-carbon-chevron-right opacity-0'"
        />
      </ElButton>

      <ElButton
        text
        class="document-tree-node-trigger !ml-0 !h-auto !min-h-0 !min-w-0 !flex-1 !justify-start !rounded-md !px-1.5 !py-1 !text-left"
        :class="isActive
          ? '!text-#2f63d9 hover:!bg-transparent hover:!text-#2f63d9'
          : '!text-secondary hover:!bg-transparent hover:!text-main'"
        :data-testid="`document-tree-node-${props.node.id}`"
        @click="emit('open', props.node.id)"
      >
        <div class="min-w-0 flex-1">
          <div
            class="truncate text-[13px] leading-5"
            :class="isActive ? 'font-medium text-#2f63d9' : 'text-secondary'"
          >
            {{ props.node.title }}
          </div>
          <div v-if="props.node.sharedByDisplayName" class="truncate text-[10px] leading-4 text-secondary/80">
            来自 {{ props.node.sharedByDisplayName }}
          </div>
        </div>
      </ElButton>

      <div
        v-if="canManageNode || hasMoreActions"
        class="ml-auto flex items-center gap-0.5 transition-opacity"
        :class="isActive ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'"
      >
        <ElButton
          v-if="canManageNode"
          text
          class="!ml-0 !h-6 !w-6 !rounded-md !p-0 !text-secondary disabled:!opacity-40"
          :class="isActive
            ? '!text-#2f63d9 hover:!bg-transparent hover:!text-#2f63d9 focus:!bg-transparent active:!bg-transparent'
            : 'hover:!bg-white hover:!text-primary'"
          :disabled="isActionPending"
          title="新建子文档"
          @click.stop="emit('createChild', props.node.id)"
        >
          <div class="i-carbon-add text-base" />
        </ElButton>

        <ElDropdown
          v-if="hasMoreActions"
          trigger="click"
          @command="handleActionCommand"
        >
          <ElButton
            text
            class="!ml-0 !h-6 !w-6 !rounded-md !p-0 !text-secondary disabled:!opacity-40"
            :class="isActive
              ? '!text-#2f63d9 hover:!bg-transparent hover:!text-#2f63d9 focus:!bg-transparent active:!bg-transparent'
              : 'hover:!bg-white hover:!text-primary'"
            :disabled="isActionPending"
            title="更多操作"
            @click.stop
          >
            <div class="i-carbon-overflow-menu-horizontal text-base" />
          </ElButton>

          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem
                v-if="canManageNode"
                command="delete"
                :divided="props.node.hasChildren"
                class="!text-#f56c6c"
              >
                删除文档
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </div>
    </div>

    <div v-if="props.node.hasChildren && isExpanded" class="mt-1 space-y-0.5">
      <DocumentTreeNodeItem
        v-for="child in props.node.children"
        :key="child.id"
        :node="child"
        :section-id="props.sectionId"
        :depth="depth + 1"
        :active-node-id="props.activeNodeId"
        :expanded-node-ids="props.expandedNodeIds"
        :is-action-pending="props.isActionPending"
        @open="emit('open', $event)"
        @toggle="emit('toggle', $event)"
        @create-child="emit('createChild', $event)"
        @delete-node="emit('deleteNode', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.document-tree-node-item-surface {
  position: relative;
}

.document-tree-node-item-active {
  z-index: 10;

  :deep(.el-button) {
    --el-button-hover-bg-color: transparent;
    --el-button-active-bg-color: transparent;
    --el-button-outline-color: transparent;
    --el-button-hover-border-color: transparent;
    --el-button-active-border-color: transparent;
  }

  :deep(.el-button:hover),
  :deep(.el-button:focus),
  :deep(.el-button:active),
  :deep(.el-button.is-active) {
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }
}

.document-tree-node-trigger {
  :deep(.el-button__content) {
    width: 100%;
    justify-content: flex-start;
    gap: 0.5rem;
  }
}
</style>
