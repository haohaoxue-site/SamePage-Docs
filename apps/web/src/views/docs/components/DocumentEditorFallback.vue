<script setup lang="ts">
import type { DocumentEditorFallbackEmits, DocumentEditorFallbackProps } from '../typing'
import { DOCUMENT_PANE_STATE } from '@haohaoxue/samepage-contracts'
import { computed } from 'vue'
import { SvgIconCategory } from '@/components/svg-icon/typing'

type DocumentEditorFallbackActionEvent = 'createDocument' | 'openFallbackDocument' | 'retryLoad'

/**
 * 回退态操作。
 */
interface DocumentEditorFallbackAction {
  event: DocumentEditorFallbackActionEvent
  label: string
  type?: 'primary' | 'default'
}

/**
 * 回退态展示数据。
 */
interface DocumentEditorFallbackState {
  title: string
  description: string
  iconCategory: SvgIconCategory
  icon: string
  spin?: boolean
  actions: DocumentEditorFallbackAction[]
}

const props = defineProps<DocumentEditorFallbackProps>()
const emits = defineEmits<DocumentEditorFallbackEmits>()

const fallbackState = computed<DocumentEditorFallbackState>(() => {
  if (props.contentError) {
    return {
      title: '文档内容暂时无法打开',
      description: props.hasFallbackDocument
        ? '这篇文档当前无法在编辑器中恢复，你可以重新加载，或先打开其他可用文档。'
        : '这篇文档当前无法在编辑器中恢复，你可以重新加载后再试。',
      iconCategory: SvgIconCategory.UI,
      icon: 'warning',
      actions: [
        {
          event: 'retryLoad',
          label: '重新加载',
          type: 'primary',
        },
        ...(
          props.hasFallbackDocument
            ? [{
                event: 'openFallbackDocument' as const,
                label: '打开可用文档',
              }]
            : []
        ),
      ],
    }
  }

  if (props.paneState === DOCUMENT_PANE_STATE.LOADING) {
    return {
      title: '正在准备文档',
      description: props.isLoading ? '正在加载当前文档，请稍候。' : '正在恢复最近打开的内容，请稍候。',
      iconCategory: SvgIconCategory.UI,
      icon: 'spinner-orbit',
      spin: true,
      actions: [],
    }
  }

  if (props.paneState === DOCUMENT_PANE_STATE.EMPTY) {
    return {
      title: '还没有文档',
      description: '先创建第一篇文档，之后进入工作区会自动回到最近内容。',
      iconCategory: SvgIconCategory.UI,
      icon: 'document-add',
      actions: [
        {
          event: 'createDocument',
          label: '新建第一篇文档',
          type: 'primary',
        },
      ],
    }
  }

  if (props.paneState === DOCUMENT_PANE_STATE.NOT_FOUND) {
    return {
      title: '文档不存在',
      description: '这个链接可能已经失效，或者文档已被删除。',
      iconCategory: SvgIconCategory.UI,
      icon: 'document-unknown',
      actions: props.hasFallbackDocument
        ? [
            {
              event: 'openFallbackDocument',
              label: '打开可用文档',
              type: 'primary',
            },
          ]
        : [
            {
              event: 'createDocument',
              label: '新建文档',
              type: 'primary',
            },
          ],
    }
  }

  if (props.paneState === DOCUMENT_PANE_STATE.FORBIDDEN) {
    return {
      title: '无权访问这篇文档',
      description: '你可以先回到其他可访问的文档继续工作。',
      iconCategory: SvgIconCategory.UI,
      icon: 'lock',
      actions: props.hasFallbackDocument
        ? [
            {
              event: 'openFallbackDocument',
              label: '打开可用文档',
              type: 'primary',
            },
          ]
        : [],
    }
  }

  if (props.paneState === DOCUMENT_PANE_STATE.ERROR) {
    return {
      title: '文档加载失败',
      description: '当前内容暂时无法打开，你可以重试或先回到其他文档。',
      iconCategory: SvgIconCategory.UI,
      icon: 'warning',
      actions: [
        {
          event: 'retryLoad',
          label: '重新加载',
          type: 'primary',
        },
        ...(
          props.hasFallbackDocument
            ? [{
                event: 'openFallbackDocument' as const,
                label: '打开可用文档',
              }]
            : []
        ),
      ],
    }
  }

  return {
    title: '选择一篇文档',
    description: '已进入文档工作区，先打开一篇文档再开始编辑。',
    iconCategory: SvgIconCategory.UI,
    icon: 'document-view',
    actions: props.hasFallbackDocument
      ? [
          {
            event: 'openFallbackDocument',
            label: '打开第一篇文档',
            type: 'primary',
          },
        ]
      : [
          {
            event: 'createDocument',
            label: '新建文档',
            type: 'primary',
          },
        ],
  }
})

function emitAction(event: DocumentEditorFallbackActionEvent) {
  switch (event) {
    case 'createDocument':
      emits('createDocument')
      return
    case 'openFallbackDocument':
      emits('openFallbackDocument')
      return
    case 'retryLoad':
      emits('retryLoad')
  }
}
</script>

<template>
  <div class="document-editor-fallback">
    <ElEmpty>
      <template #image>
        <div class="document-editor-fallback__icon-shell">
          <SvgIcon
            :category="fallbackState.iconCategory"
            :icon="fallbackState.icon"
            size="1.75rem"
            :class="{ 'animate-spin': fallbackState.spin }"
          />
        </div>
      </template>

      <template #description>
        <div class="document-editor-fallback__description">
          <div class="document-editor-fallback__title">
            {{ fallbackState.title }}
          </div>

          <div class="document-editor-fallback__copy">
            {{ fallbackState.description }}
          </div>
        </div>
      </template>

      <div
        v-if="fallbackState.actions.length"
        class="document-editor-fallback__actions"
      >
        <ElButton
          v-for="action in fallbackState.actions"
          :key="action.event"
          :type="action.type"
          @click="emitAction(action.event)"
        >
          {{ action.label }}
        </ElButton>
      </div>
    </ElEmpty>
  </div>
</template>

<style scoped lang="scss">
.document-editor-fallback {
  display: flex;
  flex: 1 1 0%;
  align-items: center;
  justify-content: center;
  min-height: 0;

  .document-editor-fallback__icon-shell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--brand-primary) 8%, transparent);
    color: var(--brand-primary);
  }

  .document-editor-fallback__description {
    display: grid;
    gap: 0.5rem;
    justify-items: center;
    max-width: 24rem;
    color: var(--brand-text-secondary);
  }

  .document-editor-fallback__title {
    color: var(--brand-text-primary);
    font-size: 1rem;
    font-weight: 600;
  }

  .document-editor-fallback__copy {
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .document-editor-fallback__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1rem;
  }
}
</style>
