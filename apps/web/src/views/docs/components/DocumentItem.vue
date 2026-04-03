<script setup lang="ts">
import type {
  DocumentItemEmits,
  DocumentItemProps,
} from '../typing'
import { computed } from 'vue'

const props = defineProps<DocumentItemProps>()

const emits = defineEmits<DocumentItemEmits>()

const isActive = computed(() => props.activeDocumentId === props.item.id)
const isExpanded = computed(() => props.expandedDocumentIds.has(props.item.id))
const canManageDocument = computed(() => props.sectionId === 'personal')

function openDocument() {
  emits('open', props.item.id)
}

function toggleItem() {
  if (!props.item.hasChildren) {
    return
  }

  emits('toggle', props.item.id)
}

function handleDeleteCommand() {
  emits('deleteDocument', props.item.id)
}

function getItemStateClass() {
  return isActive.value ? 'active' : 'idle'
}

function getActionsStateClass() {
  return isActive.value ? 'visible' : 'hidden'
}

function getExpandIconName() {
  return isExpanded.value ? 'chevron-down' : 'chevron-right'
}
</script>

<template>
  <div class="document-tree-item" :style="{ paddingLeft: `${depth * 18}px` }">
    <div
      class="document-tree-item-surface"
      :class="getItemStateClass()"
      @click="openDocument"
    >
      <ElButton
        v-if="props.item.hasChildren"
        text
        class="document-tree-item__icon-button"
        :class="getItemStateClass()"
        @click.stop="toggleItem"
      >
        <SvgIcon category="ui" :icon="getExpandIconName()" size="13px" />
      </ElButton>

      <div v-else class="h-5 w-5 shrink-0" />

      <div class="document-tree-item__title" :class="getItemStateClass()">
        {{ props.item.title }}
      </div>

      <div
        v-if="canManageDocument"
        class="document-tree-item__actions"
        :class="getActionsStateClass()"
        @click.stop
      >
        <ElButton
          text
          class="document-tree-item__icon-button"
          :class="getItemStateClass()"
          :disabled="isActionPending"
          title="新建子文档"
          @click.stop="emits('createChild', props.item.id)"
        >
          <SvgIcon category="ui" icon="plus" size="14px" />
        </ElButton>

        <ElDropdown trigger="click" @command="handleDeleteCommand">
          <ElButton
            text
            class="document-tree-item__icon-button"
            :class="getItemStateClass()"
            :disabled="isActionPending"
            title="更多操作"
            @click.stop
          >
            <SvgIcon category="ui" icon="more" size="14px" />
          </ElButton>

          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem command="delete" class="!text-danger">
                删除文档
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </div>
    </div>

    <div v-if="props.item.hasChildren && isExpanded" class="mt-1 space-y-0.5">
      <DocumentItem
        v-for="child in props.item.children"
        :key="child.id"
        :item="child"
        :section-id="props.sectionId"
        :depth="depth + 1"
        :active-document-id="props.activeDocumentId"
        :expanded-document-ids="props.expandedDocumentIds"
        :is-action-pending="props.isActionPending"
        @open="emits('open', $event)"
        @toggle="emits('toggle', $event)"
        @create-child="emits('createChild', $event)"
        @delete-document="emits('deleteDocument', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.document-tree-item {
  .document-tree-item-surface {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.375rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    cursor: pointer;
    outline: none;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease;

    &:focus-visible {
      border-color: color-mix(in srgb, var(--brand-primary) 20%, transparent);
      background: var(--brand-fill-lighter);
    }

    &.active {
      color: var(--brand-primary);
      border-color: color-mix(in srgb, var(--brand-primary) 20%, transparent);
      background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
      box-shadow:
        0 1px 2px 0 color-mix(in srgb, var(--brand-primary) 6%, transparent),
        0 1px 2px 0 color-mix(in srgb, var(--brand-text-primary) 5%, transparent);

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

    &.idle {
      &:hover {
        background: var(--brand-fill-lighter);
      }
    }

    .document-tree-item__icon-button {
      margin-left: 0 !important;
      min-width: 1.25rem !important;
      width: 1.25rem !important;
      height: 1.25rem !important;
      padding: 0 !important;
      border-radius: 0.375rem !important;
      color: var(--brand-text-secondary);

      &:disabled {
        opacity: 0.3 !important;
      }

      &.active {
        color: var(--brand-primary);

        &:hover,
        &:focus,
        &:active {
          background: transparent !important;
          color: var(--brand-primary);
        }
      }

      &.idle {
        &:hover {
          color: var(--brand-primary);
          background: var(--brand-bg-surface-raised);
        }
      }
    }

    .document-tree-item__title {
      flex: 1 1 0%;
      min-width: 0;
      overflow: hidden;
      font-size: 13px;
      line-height: 1.25rem;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.active {
        color: var(--brand-primary);
        font-weight: 500;
      }

      &.idle {
        color: var(--brand-text-secondary);
      }
    }

    .document-tree-item__actions {
      display: flex;
      align-items: center;
      gap: 1px;
      margin-left: auto;
      transition: opacity 0.2s ease;

      &.visible {
        opacity: 1;
      }

      &.hidden {
        pointer-events: none;
        opacity: 0;
      }
    }

    &:hover .document-tree-item__actions.hidden,
    &:focus-within .document-tree-item__actions.hidden {
      pointer-events: auto;
      opacity: 1;
    }
  }
}
</style>
