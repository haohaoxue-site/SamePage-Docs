<script setup lang="ts">
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import SystemAdminUserTable from '../components/SystemAdminUserTable.vue'
import { useUsers } from './composables/useUsers'

const {
  errorMessage,
  formatDate,
  governance,
  handleGovernanceSwitchChange,
  isLoading,
  isGovernanceSwitchDisabled,
  registrationSwitches,
  savingGovernanceFields,
  shouldShowEmailServiceHint,
  summaryCards,
  systemAdminStatusText,
  toggleUserStatus,
  updatingUserId,
  users,
} = useUsers()
</script>

<template>
  <div v-loading="isLoading" class="admin-users flex flex-col gap-6 py-6">
    <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <ConsoleMetricCard
        v-for="card in summaryCards"
        :key="card.label"
        :detail="card.detail"
        :label="card.label"
        :value="card.value"
        :icon-category="card.iconCategory"
        :icon="card.icon"
      />
    </section>

    <ElAlert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="rounded-xl" />

    <div v-else class="flex flex-col gap-6">
      <ElCard shadow="never" class="border-border-a80">
        <div class="admin-users__governance">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 class="m-0 text-base font-bold text-main">
                  注册治理
                </h2>
                <p class="mt-1.5 text-xs leading-6 text-secondary">
                  切换后立即生效，只影响新注册，不影响已有账号继续登录。
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3">
              <label
                v-for="item in registrationSwitches"
                :key="item.key"
                class="admin-users__switch-card"
              >
                <div>
                  <span class="block text-sm font-semibold text-main">{{ item.label }}</span>
                  <p class="mt-1 text-xs leading-6 text-secondary">
                    {{ item.description }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2.5">
                  <ElTooltip
                    v-if="shouldShowEmailServiceHint(item.key)"
                    placement="top"
                    effect="light"
                    :show-after="150"
                  >
                    <template #content>
                      <div class="admin-users__switch-hint">
                        <p class="admin-users__switch-hint-text">
                          未启用发件服务，开启邮箱密码注册前请先前往邮件配置启用发件服务。
                        </p>
                        <RouterLink to="/admin/email" class="admin-users__switch-hint-link">
                          前往发件配置
                        </RouterLink>
                      </div>
                    </template>
                    <button
                      type="button"
                      class="admin-users__switch-hint-trigger"
                      @click.stop.prevent
                      @mousedown.stop.prevent
                    >
                      <SvgIcon category="ui" icon="info" size="1rem" />
                    </button>
                  </ElTooltip>
                  <ElSwitch
                    :model-value="governance[item.key]"
                    :disabled="isGovernanceSwitchDisabled(item.key)"
                    :loading="savingGovernanceFields[item.key]"
                    @change="handleGovernanceSwitchChange(item.key, $event)"
                  />
                </div>
              </label>
            </div>
          </div>

          <div class="admin-users__governance-block--summary rounded-xl p-4">
            <h2 class="m-0 text-base font-bold text-main">
              系统管理员引导状态
            </h2>
            <ElDescriptions :column="1" direction="vertical" size="small" class="admin-users__governance-summary">
              <ElDescriptionsItem label="管理员邮箱">
                <span class="admin-users__governance-summary-value">
                  {{ governance.systemAdminEmail }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="显示名称">
                <span class="admin-users__governance-summary-value">
                  {{ governance.systemAdminDisplayName || 'System Admin' }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="当前状态">
                <span class="admin-users__governance-summary-value">
                  {{ systemAdminStatusText }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="最近登录">
                <span class="admin-users__governance-summary-value">
                  {{ formatDate(governance.systemAdminLastLoginAt) }}
                </span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="最近改密">
                <span class="admin-users__governance-summary-value">
                  {{ formatDate(governance.systemAdminPasswordUpdatedAt) }}
                </span>
              </ElDescriptionsItem>
            </ElDescriptions>
          </div>
        </div>
      </ElCard>

      <SystemAdminUserTable
        :updating-user-id="updatingUserId"
        :users="users"
        @toggle-status="toggleUserStatus"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-users {
  &__governance {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 960px) {
      grid-template-columns: minmax(0, 1.4fr) minmax(18rem, 0.8fr);
    }
  }

  &__governance-block--summary {
    background: color-mix(in srgb, var(--brand-fill-lighter) 85%, transparent);
  }

  &__governance-summary {
    margin-top: 1rem;

    :deep(.el-descriptions__body) {
      background: transparent;
    }

    :deep(.el-descriptions__table) {
      width: 100%;
    }

    :deep(.el-descriptions__cell) {
      padding-bottom: 0.875rem;
    }

    :deep(.el-descriptions__cell:last-child) {
      padding-bottom: 0;
    }

    :deep(.el-descriptions__label) {
      margin-bottom: 0.25rem;
      color: var(--brand-text-secondary);
      font-size: 0.75rem;
    }
  }

  &__governance-summary-value {
    display: block;
    color: var(--brand-text-primary);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.6;
  }

  &__switch-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border: 1px solid color-mix(in srgb, var(--brand-border-base) 80%, transparent);
    border-radius: 0.875rem;
    padding: 1rem;
    background: var(--brand-bg-surface);
  }

  &__switch-hint {
    max-width: 16rem;
  }

  &__switch-hint-text {
    margin: 0;
    color: var(--brand-text-primary);
    font-size: 0.75rem;
    line-height: 1.6;
  }

  &__switch-hint-link {
    display: inline-flex;
    margin-top: 0.5rem;
    color: var(--brand-primary);
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      opacity: 0.8;
    }
  }

  &__switch-hint-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    color: var(--brand-warning);
    background: color-mix(in srgb, var(--brand-warning) 12%, transparent);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: color-mix(in srgb, var(--brand-warning) 18%, transparent);
    }

    &:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--brand-primary) 35%, transparent);
      outline-offset: 2px;
    }
  }
}
</style>
