<script setup lang="ts">
import type { AppearancePreference, AuthUserDto } from '@haohaoxue/samepage-domain'
import {
  APPEARANCE_PREFERENCE_LABELS,
  APPEARANCE_PREFERENCE_VALUES,
} from '@haohaoxue/samepage-contracts'
import { ElMessage } from 'element-plus'
import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SvgIconCategory } from '@/components/svg-icon/typing'
import { useAuthSession } from '@/layouts/composables/useAuthSession'
import { getWorkspaceEntryPath } from '@/layouts/utils/workspace-entry'
import { DEFAULT_ADMIN_NAVIGATION_ITEM } from '@/router/navigation'
import { useUserStore } from '@/stores/user'
import { getRequestErrorDisplayMessage } from '@/utils/request-error'

type SessionMenuUser = Pick<AuthUserDto, 'displayName' | 'email' | 'avatarUrl'> & {
  initial: string
}

const props = withDefaults(defineProps<{
  showContextSwitch?: boolean
}>(), {
  showContextSwitch: true,
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const menuVisible = shallowRef(false)
const appearanceMenuVisible = shallowRef(false)
const avatarImageLoadFailed = shallowRef(false)
const { currentUser: sessionUser, isLoggingOut, logout } = useAuthSession()
const sessionUserSnapshot = shallowRef(sessionUser.value)

const appearanceOptions = APPEARANCE_PREFERENCE_VALUES.map(value => ({
  label: APPEARANCE_PREFERENCE_LABELS[value],
  value,
}))

const resolvedSessionUser = computed(() => sessionUser.value ?? sessionUserSnapshot.value!)
const currentUser = computed<SessionMenuUser>(() => {
  const user = resolvedSessionUser.value

  const initial = user.displayName.trim().slice(0, 1).toUpperCase()

  return {
    displayName: user.displayName,
    email: user.email ?? '',
    avatarUrl: user.avatarUrl,
    initial: initial || 'U',
  }
})

const isAdminRoute = computed(() => route.path.startsWith('/admin'))

const contextSwitchAction = computed(() => {
  if (!props.showContextSwitch) {
    return null
  }

  if (isAdminRoute.value) {
    return {
      label: '进入工作区',
      iconCategory: SvgIconCategory.UI,
      icon: 'arrow-left',
    }
  }

  if (userStore.isSystemAdmin) {
    return {
      label: '进入管理区',
      iconCategory: SvgIconCategory.UI,
      icon: 'user-admin',
    }
  }

  return null
})

const currentAppearanceLabel = computed(() => APPEARANCE_PREFERENCE_LABELS[userStore.preferences.appearance])
const isSavingAppearance = computed(() => userStore.isSavingAppearance)

const currentAvatarUrl = computed(() => {
  const avatarUrl = currentUser.value.avatarUrl?.trim()

  if (!avatarUrl || avatarImageLoadFailed.value) {
    return null
  }

  return avatarUrl
})

const currentAvatarAlt = computed(() => `${currentUser.value.displayName} 的头像`)

watch(sessionUser, (user) => {
  if (user) {
    sessionUserSnapshot.value = user
  }
}, {
  immediate: true,
})

watch(menuVisible, (visible) => {
  if (!visible) {
    appearanceMenuVisible.value = false
  }
})

watch(() => currentUser.value.avatarUrl, () => {
  avatarImageLoadFailed.value = false
})

function toggleAppearanceMenu() {
  if (isSavingAppearance.value) {
    return
  }

  appearanceMenuVisible.value = !appearanceMenuVisible.value
}

async function handleAppearanceSelect(mode: AppearancePreference) {
  if (isSavingAppearance.value || userStore.preferences.appearance === mode) {
    return
  }

  try {
    await userStore.updateAppearancePreference(mode)
  }
  catch (error) {
    ElMessage.error(getRequestErrorDisplayMessage(error, '保存外观偏好失败'))
  }
}

async function switchContext() {
  appearanceMenuVisible.value = false
  menuVisible.value = false

  if (isAdminRoute.value) {
    await router.push(getWorkspaceEntryPath())
    return
  }

  await router.push(DEFAULT_ADMIN_NAVIGATION_ITEM.path)
}

async function openUserSettings() {
  appearanceMenuVisible.value = false
  menuVisible.value = false
  await router.push('/user')
}

function handleAvatarImageError() {
  avatarImageLoadFailed.value = true
}

async function handleLogout() {
  appearanceMenuVisible.value = false
  menuVisible.value = false
  await logout()
}

function getLogoutIconName() {
  return isLoggingOut.value
    ? 'spinner-orbit'
    : 'logout'
}
</script>

<template>
  <ElPopover
    v-model:visible="menuVisible"
    trigger="click"
    placement="bottom-end"
    :width="256"
    :offset="12"
    :show-arrow="false"
    popper-class="session-user-menu-popper"
  >
    <template #reference>
      <ElButton
        circle
        class="session-user-avatar-trigger"
      >
        <ElAvatar
          :size="40"
          class="session-user-avatar-trigger__avatar"
        >
          <img
            v-if="currentAvatarUrl"
            :key="currentAvatarUrl"
            :src="currentAvatarUrl"
            :alt="currentAvatarAlt"
            referrerpolicy="no-referrer"
            class="session-user-avatar-image"
            @error="handleAvatarImageError"
          >
          <span
            v-else
            class="session-user-avatar-fallback"
          >
            {{ currentUser.initial }}
          </span>
        </ElAvatar>
      </ElButton>
    </template>

    <div class="session-user-menu">
      <div class="session-user-profile">
        <ElAvatar
          :size="40"
          class="session-user-profile__avatar"
        >
          <img
            v-if="currentAvatarUrl"
            :key="currentAvatarUrl"
            :src="currentAvatarUrl"
            :alt="currentAvatarAlt"
            referrerpolicy="no-referrer"
            class="session-user-avatar-image"
            @error="handleAvatarImageError"
          >
          <span
            v-else
            class="session-user-profile__avatar-fallback"
          >
            {{ currentUser.initial }}
          </span>
        </ElAvatar>

        <div class="session-user-profile__meta">
          <div class="truncate text-[13px] font-semibold text-main">
            {{ currentUser.displayName }}
          </div>
          <div class="truncate pt-0.5 text-[11px] text-secondary">
            {{ currentUser.email }}
          </div>
        </div>
      </div>

      <ElButton
        v-if="contextSwitchAction"
        text
        class="session-context-switch"
        @click="switchContext"
      >
        <span class="session-context-switch__content">
          <span class="session-context-switch__icon">
            <SvgIcon :category="contextSwitchAction.iconCategory" :icon="contextSwitchAction.icon" size="14px" />
          </span>

          <span class="session-context-switch__label">
            {{ contextSwitchAction.label }}
          </span>

          <SvgIcon category="ui" icon="chevron-right" size="11px" class="text-primary-a70" />
        </span>
      </ElButton>

      <div class="session-user-divider" />

      <div class="session-menu-subpanel-anchor">
        <ElButton
          text
          class="session-user-menu-item session-user-menu-entry"
          :class="{ 'is-active': appearanceMenuVisible }"
          :disabled="isSavingAppearance"
          @click.stop="toggleAppearanceMenu"
        >
          <span class="session-user-menu-entry__content">
            <SvgIcon category="ui" icon="contrast" size="14px" class="session-user-menu-entry__icon" />

            <span class="session-user-menu-entry__summary">
              <span class="session-user-menu-entry__title">
                外观
              </span>

              <span class="session-user-menu-entry__current">
                {{ currentAppearanceLabel }}
              </span>
            </span>

            <SvgIcon
              category="ui"
              icon="chevron-right"
              size="14px"
              class="session-user-menu-entry__chevron"
              :class="appearanceMenuVisible ? 'translate-x-0.5 text-primary' : ''"
            />
          </span>
        </ElButton>

        <div v-if="appearanceMenuVisible" class="session-appearance-panel">
          <div class="flex flex-col gap-1">
            <ElButton
              v-for="option in appearanceOptions"
              :key="option.value"
              text
              class="session-appearance-option"
              :class="{ 'is-active': userStore.preferences.appearance === option.value }"
              :disabled="isSavingAppearance"
              @click.stop="handleAppearanceSelect(option.value)"
            >
              <span class="session-appearance-option__content">
                <span class="session-appearance-option__label">
                  <span class="truncate text-[13px] leading-none font-medium text-main">
                    {{ option.label }}
                  </span>
                </span>

                <SvgIcon
                  v-if="userStore.preferences.appearance === option.value"
                  category="ui"
                  icon="check"
                  size="14px"
                  class="shrink-0 text-primary"
                />
              </span>
            </ElButton>
          </div>
        </div>
      </div>

      <div class="session-user-divider" />

      <ElButton
        text
        class="session-user-menu-item"
        @click="openUserSettings"
      >
        <span class="session-user-menu-item__content">
          <SvgIcon category="ui" icon="settings-gear" size="14px" class="session-user-menu-item__icon" />
          <span class="leading-none">个人设置</span>
        </span>
      </ElButton>

      <div class="session-user-divider" />

      <ElButton
        text
        class="session-user-menu-item session-user-logout"
        :disabled="isLoggingOut"
        @click="handleLogout"
      >
        <span class="session-user-menu-item__content">
          <SvgIcon
            category="ui"
            :icon="getLogoutIconName()"
            size="14px"
            class="session-user-menu-item__icon"
            :class="{ 'animate-spin': isLoggingOut }"
          />
          <span class="leading-none">{{ isLoggingOut ? '退出中...' : '退出登录' }}</span>
        </span>
      </ElButton>
    </div>
  </ElPopover>
</template>

<style lang="scss">
@mixin session-menu-button-base($text-color) {
  margin-left: 0;
  width: 100%;
  height: 2.75rem;
  justify-content: flex-start;
  border-radius: 0.75rem;
  padding-inline: 0.5rem;
  padding-block: 0;
  font-size: 0.78125rem;
  line-height: 1;
  --el-button-text-color: #{$text-color};

  > span {
    display: flex;
    align-items: stretch;
    height: 100%;
    width: 100%;
    justify-content: flex-start;
  }
}

.session-user-menu {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.session-user-menu-popper.el-popover {
  position: relative;
  overflow: visible;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-border-base) 92%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--brand-bg-surface-raised) 96%, transparent);
  box-shadow: var(--brand-shadow-floating);
  backdrop-filter: blur(16px);
}

.session-user-profile {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 1px;
}

.session-user-profile__avatar {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-border-base) 70%, transparent);
}

.session-user-profile__avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: color-mix(in srgb, var(--brand-text-primary) 82%, var(--brand-primary) 18%);
  font-size: 13px;
  font-weight: 700;
  background:
    radial-gradient(circle at 30% 28%, color-mix(in srgb, white 72%, transparent), transparent 46%),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--brand-fill-light) 88%, var(--brand-bg-surface)),
      color-mix(in srgb, var(--brand-fill-base) 76%, var(--brand-bg-surface-raised))
    );
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 28%, transparent);
}

.session-user-profile__meta {
  flex: 1 1 0%;
  min-width: 0;
  padding-top: 1px;
}

.session-user-divider {
  height: 1px;
  background: color-mix(in srgb, var(--brand-border-base) 80%, transparent);
}

.session-context-switch {
  margin-left: 0;
  width: 100%;
  min-height: 2.5rem;
  justify-content: flex-start;
  border: 1px solid color-mix(in srgb, var(--brand-primary) 12%, transparent);
  border-radius: 0.75rem;
  padding: 0.375rem 0.5rem;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-primary) 6%, var(--brand-bg-surface-raised)),
    var(--brand-bg-surface-raised)
  );
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.session-context-switch:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 20%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-primary) 10%, var(--brand-bg-surface-raised)),
    var(--brand-bg-surface-raised)
  );
}

.session-context-switch > span {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
}

.session-context-switch__content,
.session-user-menu-entry__content,
.session-user-menu-item__content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  height: 100%;
  text-align: left;
}

.session-context-switch__icon,
.session-user-menu-entry__icon,
.session-user-menu-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  font-size: 14px;
}

.session-context-switch__icon {
  color: var(--brand-primary);
}

.session-context-switch__label {
  flex: 1 1 0%;
  min-width: 0;
  overflow: hidden;
  color: var(--brand-text-primary);
  font-size: 12.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-menu-subpanel-anchor {
  position: relative;
}

.session-user-menu-entry,
.session-appearance-option,
.session-user-menu-item {
  @include session-menu-button-base(var(--brand-text-primary));
}

.session-user-menu-entry:hover,
.session-appearance-option:hover,
.session-user-menu-item:hover {
  --el-fill-color-light: var(--brand-fill-light);
  --el-button-text-color: var(--brand-text-primary);
}

.session-user-menu-entry.is-active,
.session-appearance-option.is-active {
  --el-fill-color-light: var(--brand-fill-light);
  --el-button-text-color: var(--brand-text-primary);
  background: var(--brand-fill-light);
}

.session-user-menu-entry__content,
.session-user-menu-item__content {
  gap: 0.625rem;
}

.session-user-menu-entry__icon {
  color: var(--brand-text-secondary);
}

.session-user-menu-entry__summary {
  display: flex;
  flex: 1 1 0%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.session-user-menu-entry__title {
  overflow: hidden;
  color: var(--brand-text-primary);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-user-menu-entry__current {
  flex-shrink: 0;
  color: var(--brand-text-secondary);
  font-size: 12px;
  line-height: 1;
}

.session-user-menu-entry__chevron {
  flex-shrink: 0;
  color: var(--brand-text-secondary);
  font-size: 14px;
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}

.session-appearance-panel {
  position: absolute;
  top: 50%;
  right: calc(100% + 14px);
  z-index: 5;
  width: 220px;
  transform: translateY(-50%);
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-border-base) 92%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--brand-bg-surface-raised) 96%, transparent);
  box-shadow: var(--brand-shadow-floating);
  backdrop-filter: blur(16px);
}

.session-appearance-option__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  height: 100%;
  text-align: left;
}

.session-appearance-option__label {
  min-width: 0;
}

.session-user-menu-item__icon {
  color: var(--brand-text-secondary);
  font-size: 14px;
}

.session-user-logout {
  @include session-menu-button-base(var(--brand-error));
}

.session-user-logout:hover {
  --el-fill-color-light: var(--el-color-danger-light-9);
  --el-button-text-color: var(--brand-error);
}

.session-user-logout .session-user-menu-item__icon {
  color: currentColor;
}

.session-user-avatar {
  &-trigger {
    overflow: hidden !important;
    width: 2.5rem !important;
    height: 2.5rem !important;
    padding: 0 !important;
    border-color: var(--brand-border-base);
    background: var(--brand-bg-surface);

    &:hover {
      border-color: color-mix(in srgb, var(--brand-primary) 20%, var(--brand-border-base));
      background: var(--brand-bg-surface);
    }

    &__avatar {
      width: 100%;
      height: 100%;
      background: transparent;
    }
  }

  &-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: color-mix(in srgb, var(--brand-text-primary) 82%, var(--brand-primary) 18%);
    font-size: 0.875rem;
    font-weight: 700;
    background:
      radial-gradient(circle at 30% 28%, color-mix(in srgb, white 72%, transparent), transparent 46%),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--brand-fill-light) 88%, var(--brand-bg-surface)),
        color-mix(in srgb, var(--brand-fill-base) 76%, var(--brand-bg-surface-raised))
      );
    box-shadow: inset 0 1px 0 color-mix(in srgb, white 28%, transparent);
  }
}
</style>
