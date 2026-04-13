<script setup lang="ts">
import type { DocumentEditorPaneEmits, DocumentEditorPaneProps } from '../typing'
import { computed, defineAsyncComponent } from 'vue'
import { SvgIconCategory } from '@/components/svg-icon/typing'

type EmptyActionEvent = 'createDocument' | 'openFallbackDocument' | 'retryLoad'

interface EmptyAction {
  event: EmptyActionEvent
  label: string
  type?: 'primary' | 'default'
}

interface EmptyState {
  title: string
  description: string
  iconCategory: SvgIconCategory
  icon: string
  spin?: boolean
  actions: EmptyAction[]
}

const props = defineProps<DocumentEditorPaneProps>()

const emits = defineEmits<DocumentEditorPaneEmits>()
const TiptapEditor = defineAsyncComponent(() => import('@/components/tiptap-editor/TiptapEditor.vue'))

const emptyState = computed<EmptyState>(() => {
  if (props.paneState === 'loading') {
    return {
      title: '正在准备文档',
      description: props.isLoading ? '正在加载当前文档，请稍候。' : '正在恢复最近打开的内容，请稍候。',
      iconCategory: SvgIconCategory.UI,
      icon: 'spinner-orbit',
      spin: true,
      actions: [] as EmptyAction[],
    }
  }

  if (props.paneState === 'empty') {
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

  if (props.paneState === 'not-found') {
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

  if (props.paneState === 'forbidden') {
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

  if (props.paneState === 'error') {
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

function emitEmptyAction(event: EmptyActionEvent) {
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
  <section class="document-editor-pane">
    <template v-if="document">
      <div class="document-editor-pane__title-bar">
        <ElInput
          :model-value="document.title"
          class="document-editor-pane__title-input"
          placeholder="输入文档标题"
          @input="emits('updateTitle', $event)"
        />
      </div>

      <div class="document-editor-pane__editor-shell">
        <div class="document-editor-pane__editor-container">
          <TiptapEditor
            class="document-editor-pane__editor"
            :content="document.content"
            @update:content="emits('updateContent', $event)"
          />
        </div>
      </div>
    </template>

    <div
      v-else
      class="document-editor-pane__empty-state"
    >
      <ElEmpty>
        <template #image>
          <div class="document-editor-pane__empty-icon-shell">
            <SvgIcon
              :category="emptyState.iconCategory"
              :icon="emptyState.icon"
              size="1.75rem"
              :class="{ 'animate-spin': emptyState.spin }"
            />
          </div>
        </template>

        <template #description>
          <div class="document-editor-pane__empty-description">
            <div class="document-editor-pane__empty-title">
              {{ emptyState.title }}
            </div>

            <div class="document-editor-pane__empty-copy">
              {{ emptyState.description }}
            </div>
          </div>
        </template>

        <div
          v-if="emptyState.actions.length"
          class="document-editor-pane__empty-actions"
        >
          <ElButton
            v-for="action in emptyState.actions"
            :key="action.event"
            :type="action.type"
            @click="emitEmptyAction(action.event)"
          >
            {{ action.label }}
          </ElButton>
        </div>
      </ElEmpty>
    </div>
  </section>
</template>

<style scoped lang="scss">
.document-editor-pane {
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  min-height: 0;

  .document-editor-pane__title-bar {
    padding: 1rem;
    border-bottom: 1px solid color-mix(in srgb, var(--brand-border-base) 80%, transparent);
    background: var(--brand-bg-surface);
  }

  .document-editor-pane__title-input {
    :deep(.el-input__wrapper) {
      padding: 0;
      background: transparent;
      box-shadow: none;
    }

    :deep(.el-input__inner) {
      height: auto;
      padding: 0;
      font-size: 1.6rem;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: var(--brand-text-primary);
    }

    :deep(.el-input__inner::placeholder) {
      color: var(--brand-text-placeholder);
    }
  }

  .document-editor-pane__editor-shell {
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

  .document-editor-pane__editor-container {
    display: flex;
    flex: 1 1 0%;
    flex-direction: column;
    width: 100%;
    min-height: 100%;
    margin-inline: auto;
  }

  .document-editor-pane__editor {
    display: flex;
    flex: 1 1 0%;
    flex-direction: column;
    min-height: 100%;
  }

  .document-editor-pane__empty-state {
    display: flex;
    flex: 1 1 0%;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 2rem;
  }

  .document-editor-pane__empty-icon-shell {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    margin-inline: auto;
    border-radius: 24px;
    color: var(--brand-primary);
    background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
  }

  .document-editor-pane__empty-description {
    text-align: center;

    > * + * {
      margin-top: 0.5rem;
    }
  }

  .document-editor-pane__empty-title {
    color: var(--brand-text-primary);
    font-size: 1rem;
    font-weight: 600;
  }

  .document-editor-pane__empty-copy {
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
    line-height: 1.5rem;
  }

  .document-editor-pane__empty-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
}
</style>
