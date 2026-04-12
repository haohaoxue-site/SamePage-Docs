<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { UserDeleteSectionEmits, UserDeleteSectionProps } from '../typing'
import { computed, reactive, shallowRef, useTemplateRef } from 'vue'

const props = defineProps<UserDeleteSectionProps>()
const emit = defineEmits<UserDeleteSectionEmits>()
const deleteFormRef = useTemplateRef<FormInstance>('deleteFormRef')
const isDialogVisible = shallowRef(false)
const form = reactive({
  accountConfirmation: '',
  confirmationPhrase: '',
})

const accountLabel = computed(() => props.confirmationMode === 'email' ? '当前邮箱' : '当前显示名称')
const accountPlaceholder = computed(() =>
  props.confirmationMode === 'email' ? '请输入当前邮箱' : '请输入当前显示名称',
)
const accountValidatorMessage = computed(() =>
  props.confirmationMode === 'email' ? '请输入当前邮箱完成确认' : '请输入当前显示名称完成确认',
)
const normalizedExpectedAccount = computed(() => normalizeAccountConfirmation(props.confirmationTarget, props.confirmationMode))
const isAccountConfirmationReady = computed(() =>
  normalizeAccountConfirmation(form.accountConfirmation, props.confirmationMode) === normalizedExpectedAccount.value,
)
const isPhraseConfirmationReady = computed(() => form.confirmationPhrase.trim() === props.confirmationPhrase)
const isSubmitDisabled = computed(() =>
  props.isDeleting
  || !isAccountConfirmationReady.value
  || !isPhraseConfirmationReady.value,
)
const rules = computed<FormRules>(() => ({
  accountConfirmation: [
    {
      required: true,
      message: accountValidatorMessage.value,
      trigger: ['blur', 'change'],
    },
    {
      validator: (_rule, value: string, callback) => {
        if (normalizeAccountConfirmation(value, props.confirmationMode) !== normalizedExpectedAccount.value) {
          callback(new Error(accountValidatorMessage.value))
          return
        }

        callback()
      },
      trigger: ['blur', 'change'],
    },
  ],
  confirmationPhrase: [
    {
      required: true,
      message: `请输入“${props.confirmationPhrase}”`,
      trigger: ['blur', 'change'],
    },
    {
      validator: (_rule, value: string, callback) => {
        if (value.trim() !== props.confirmationPhrase) {
          callback(new Error(`请输入“${props.confirmationPhrase}”`))
          return
        }

        callback()
      },
      trigger: ['blur', 'change'],
    },
  ],
}))

function openDialog() {
  resetForm()
  isDialogVisible.value = true
}

function closeDialog() {
  isDialogVisible.value = false
  resetForm()
}

async function handleConfirm() {
  const isValid = await deleteFormRef.value?.validate().catch(() => false)

  if (!isValid) {
    return
  }

  emit('deleteAccount', {
    accountConfirmation: form.accountConfirmation.trim(),
    confirmationPhrase: form.confirmationPhrase.trim(),
  })
}

function resetForm() {
  form.accountConfirmation = ''
  form.confirmationPhrase = ''
  deleteFormRef.value?.clearValidate()
}

function normalizeAccountConfirmation(value: string, mode: UserDeleteSectionProps['confirmationMode']) {
  return mode === 'email' ? value.trim().toLowerCase() : value.trim()
}
</script>

<template>
  <ElCard shadow="never" class="user-delete-section">
    <div class="user-delete-section__header">
      <div>
        <h2 class="user-delete-section__title">
          删除账号
        </h2>
        <p class="user-delete-section__description">
          删除后，当前邮箱、登录方式、文档和聊天记录都会被永久移除，无法恢复。
        </p>
      </div>
    </div>

    <ElButton
      type="danger"
      class="user-delete-section__action"
      :loading="props.isDeleting"
      @click="openDialog"
    >
      {{ props.isDeleting ? '删除中...' : '删除账号' }}
    </ElButton>

    <ElDialog
      v-model="isDialogVisible"
      title="确认删除账号"
      width="32rem"
      destroy-on-close
      @closed="resetForm"
    >
      <div class="user-delete-section__dialog-copy">
        <p class="user-delete-section__dialog-text">
          输入 {{ accountLabel }} 与确认短语后，才会永久删除当前账号。
        </p>
        <p class="user-delete-section__dialog-target">
          {{ accountLabel }}：{{ props.confirmationTarget }}
        </p>
      </div>

      <ElForm
        ref="deleteFormRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="user-delete-section__form"
        @submit.prevent="handleConfirm"
      >
        <ElFormItem :label="accountLabel" prop="accountConfirmation">
          <ElInput
            v-model="form.accountConfirmation"
            :autocomplete="props.confirmationMode === 'email' ? 'email' : 'off'"
            :placeholder="accountPlaceholder"
          />
        </ElFormItem>

        <ElFormItem label="确认短语" prop="confirmationPhrase">
          <ElInput
            v-model="form.confirmationPhrase"
            :placeholder="`请输入“${props.confirmationPhrase}”`"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="user-delete-section__dialog-actions">
          <ElButton @click="closeDialog">
            取消
          </ElButton>
          <ElButton
            type="danger"
            :disabled="isSubmitDisabled"
            :loading="props.isDeleting"
            @click="handleConfirm"
          >
            {{ props.isDeleting ? '删除中...' : '永久删除' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </ElCard>
</template>

<style scoped lang="scss">
.user-delete-section {
  border-color: color-mix(in srgb, var(--brand-error) 34%, var(--brand-border-base));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--brand-error) 3%, var(--brand-bg-surface)) 0%, var(--brand-bg-surface) 100%);

  &__header {
    margin-bottom: 1.25rem;
  }

  &__title {
    margin: 0;
    color: var(--brand-text-primary);
    font-size: 1.125rem;
    font-weight: 700;
  }

  &__description {
    margin: 0.375rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
  }

  &__dialog-text,
  &__dialog-target {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  &__dialog-text {
    color: var(--brand-text-primary);
  }

  &__dialog-copy {
    margin-bottom: 1rem;
  }

  &__dialog-target {
    margin-top: 0.375rem;
    color: var(--brand-text-secondary);
    word-break: break-all;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
}
</style>
