<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import type { UserProfileSectionEmits, UserProfileSectionProps } from '../typing'
import { computed, reactive, useTemplateRef } from 'vue'
import { createDisplayNameRules } from '@/views/auth/utils/rules'

const props = defineProps<UserProfileSectionProps>()
const emit = defineEmits<UserProfileSectionEmits>()
const displayNameModel = defineModel<string>('displayName', { required: true })
const profileFormRef = useTemplateRef<FormInstance>('profileFormRef')
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const form = reactive({
  displayName: displayNameModel,
})

const avatarInitial = computed(() => form.displayName.trim().slice(0, 1).toUpperCase() || 'U')
const displayNameRules = {
  displayName: createDisplayNameRules(),
}

function handlePickAvatar() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    emit('upload', file)
  }

  target.value = ''
}

async function handleSubmit() {
  const isValid = await profileFormRef.value?.validate().catch(() => false)

  if (!isValid) {
    return
  }

  emit('submit')
}
</script>

<template>
  <ElCard shadow="never" class="user-profile-section">
    <div class="user-profile-section__header">
      <div>
        <h2 class="user-profile-section__title">
          个人资料
        </h2>
        <p class="user-profile-section__description">
          更新头像和显示名称，工作区内会实时同步展示。
        </p>
      </div>
    </div>

    <div class="user-profile-section__hero">
      <ElAvatar :size="72" class="user-profile-section__avatar">
        <img
          v-if="props.avatarUrl"
          :src="props.avatarUrl"
          :alt="`${form.displayName} 的头像`"
          referrerpolicy="no-referrer"
        >
        <span v-else>{{ avatarInitial }}</span>
      </ElAvatar>

      <div class="user-profile-section__hero-actions">
        <ElButton :loading="props.isUploading" @click="handlePickAvatar">
          {{ props.isUploading ? '上传中...' : '更换头像' }}
        </ElButton>
        <p class="user-profile-section__hint">
          支持 JPG、PNG、WEBP，大小不超过 2MB。
        </p>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="handleFileChange"
      >
    </div>

    <ElForm
      ref="profileFormRef"
      :model="form"
      :rules="displayNameRules"
      label-position="top"
      class="user-profile-section__form"
      @submit.prevent="handleSubmit"
    >
      <ElFormItem label="显示名称" prop="displayName">
        <ElInput v-model="form.displayName" maxlength="50" show-word-limit />
      </ElFormItem>

      <ElButton type="primary" :loading="props.isSaving" native-type="submit">
        {{ props.isSaving ? '保存中...' : '保存资料' }}
      </ElButton>
    </ElForm>
  </ElCard>
</template>

<style scoped lang="scss">
.user-profile-section {
  border-color: color-mix(in srgb, var(--brand-border-base) 85%, transparent);

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

  &__hero {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
    padding: 1rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 78%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--brand-fill-lighter) 72%, transparent);
  }

  &__avatar {
    color: var(--brand-text-primary);
    font-size: 1.5rem;
    font-weight: 700;
    background: color-mix(in srgb, var(--brand-primary) 16%, var(--brand-bg-surface));
  }

  &__hero-actions {
    min-width: 0;
  }

  &__hint {
    margin: 0.5rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
