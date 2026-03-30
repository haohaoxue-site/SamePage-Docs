import type {
  SystemAdminUserItemDto,
  SystemAdminUserStatus,
} from '@/apis/system-admin'
import { ElMessage } from 'element-plus'
import { shallowRef } from 'vue'
import {
  listSystemAdminUsers,
  updateSystemAdminUserRole,
  updateSystemAdminUserStatus,
} from '@/apis/system-admin'

export function useAdminUsers() {
  const users = shallowRef<SystemAdminUserItemDto[]>([])
  const errorMessage = shallowRef('')
  const isLoading = shallowRef(false)
  const updatingUserId = shallowRef<string | null>(null)

  async function loadUsers() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      users.value = await listSystemAdminUsers()
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载用户列表失败'
    }
    finally {
      isLoading.value = false
    }
  }

  async function toggleUserStatus(
    user: SystemAdminUserItemDto,
    nextStatus: SystemAdminUserStatus,
  ) {
    updatingUserId.value = user.id

    try {
      const updated = await updateSystemAdminUserStatus(user.id, {
        status: nextStatus,
      })

      users.value = users.value.map(item =>
        item.id === user.id
          ? {
              ...item,
              status: updated.status,
            }
          : item,
      )
      ElMessage.success(nextStatus === 'ACTIVE' ? '用户已恢复' : '用户已禁用')
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '更新用户状态失败')
    }
    finally {
      updatingUserId.value = null
    }
  }

  async function toggleSystemAdmin(user: SystemAdminUserItemDto, enabled: boolean) {
    updatingUserId.value = user.id

    try {
      const updated = await updateSystemAdminUserRole(user.id, { enabled })

      users.value = users.value.map(item =>
        item.id === user.id
          ? {
              ...item,
              isSystemAdmin: updated.isSystemAdmin,
            }
          : item,
      )
      ElMessage.success(enabled ? '已授予系统后台权限' : '已撤销系统后台权限')
    }
    catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '更新系统管理员状态失败')
    }
    finally {
      updatingUserId.value = null
    }
  }

  return {
    users,
    errorMessage,
    isLoading,
    updatingUserId,
    loadUsers,
    toggleSystemAdmin,
    toggleUserStatus,
  }
}
