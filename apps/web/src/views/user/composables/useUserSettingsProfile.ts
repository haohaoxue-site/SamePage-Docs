import { ElMessage } from 'element-plus'
import { computed, reactive, shallowRef } from 'vue'
import { useUserStore } from '@/stores/user'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

export function useUserSettingsProfile() {
  const userStore = useUserStore()
  const isSavingProfile = shallowRef(false)
  const isUploadingAvatar = shallowRef(false)
  const profileForm = reactive({
    displayName: '',
  })

  const avatarUrl = computed(() => userStore.settings?.profile.avatarUrl ?? userStore.currentUser?.avatarUrl ?? null)

  function syncProfileForm() {
    const nextSettings = userStore.settings

    if (!nextSettings) {
      return
    }

    profileForm.displayName = nextSettings.profile.displayName
  }

  async function saveProfile() {
    isSavingProfile.value = true

    try {
      await userStore.updateProfile(profileForm.displayName.trim())
      profileForm.displayName = userStore.currentUser?.displayName ?? profileForm.displayName
      ElMessage.success('资料已更新')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '保存资料失败'))
    }
    finally {
      isSavingProfile.value = false
    }
  }

  async function uploadAvatar(file: File) {
    isUploadingAvatar.value = true

    try {
      await userStore.updateAvatar(file)
      ElMessage.success('头像已更新')
    }
    catch (error) {
      ElMessage.error(getRequestErrorDisplayMessage(error, '上传头像失败'))
    }
    finally {
      isUploadingAvatar.value = false
    }
  }

  return {
    avatarUrl,
    isSavingProfile,
    isUploadingAvatar,
    profileForm,
    syncProfileForm,
    saveProfile,
    uploadAvatar,
  }
}
