<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import type { UserProfileSectionEmits, UserProfileSectionProps } from '../typing'
import { useTemplateRef } from 'vue'
import { useUserProfileSection } from '../composables/useUserProfileSection'
import UserSettingsSectionHeader from './UserSettingsSectionHeader.vue'

const props = defineProps<UserProfileSectionProps>()
const emit = defineEmits<UserProfileSectionEmits>()
const displayNameModel = defineModel<string>('displayName', { required: true })
const profileFormRef = useTemplateRef<FormInstance>('profileFormRef')
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const {
  avatarInitial,
  displayNameRules,
  form,
  handleFileChange,
  handlePickAvatar,
  handleSaveDisplayName,
  sectionDescription,
} = useUserProfileSection({
  displayName: displayNameModel,
  fileInputRef,
  onSaveDisplayName: () => emit('saveDisplayName'),
  onUpload: file => emit('upload', file),
  props,
  profileFormRef,
})
</script>

<template>
  <ElCard shadow="never" class="user-profile-section">
    <UserSettingsSectionHeader
      title="个人资料"
      :description="sectionDescription"
    />

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
      :rules="props.canEditDisplayName ? displayNameRules : undefined"
      label-position="top"
      class="user-profile-section__form"
      @submit.prevent="handleSaveDisplayName"
    >
      <ElFormItem label="显示名称" prop="displayName">
        <div class="user-profile-section__display-name-row w-full">
          <ElInput
            v-model="form.displayName"
            :readonly="!props.canEditDisplayName"
            maxlength="50"
            show-word-limit
          />
          <ElButton
            v-if="props.canEditDisplayName"
            type="primary"
            :loading="props.isSavingDisplayName"
            native-type="submit"
          >
            保存
          </ElButton>
        </div>
      </ElFormItem>
    </ElForm>
  </ElCard>
</template>

<style scoped lang="scss">
.user-profile-section {
  border-color: color-mix(in srgb, var(--brand-border-base) 85%, transparent);

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

  &__display-name-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;

    :deep(.el-input) {
      flex: 1;
      min-width: 0;
    }

    :deep(.el-button) {
      flex-shrink: 0;
    }
  }
}
</style>
