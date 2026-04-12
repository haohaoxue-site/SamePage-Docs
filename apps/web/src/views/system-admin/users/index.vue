<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { SvgIconCategory } from '@/components/svg-icon/typing'
import { formatDateTime } from '@/utils/dayjs'
import ConsoleMetricCard from '../components/ConsoleMetricCard.vue'
import SystemAdminUserTable from '../components/SystemAdminUserTable.vue'
import { useAdminUsers } from './composables/useAdminUsers'

const {
  errorMessage,
  governance,
  isLoading,
  loadData,
  savingGovernanceFields,
  toggleUserStatus,
  updateGovernanceOption,
  updatingUserId,
  users,
} = useAdminUsers()

const registrationSwitches = [
  {
    key: 'allowPasswordRegistration',
    label: '邮箱密码注册',
    description: '控制新的邮箱密码账号是否允许注册。',
  },
  {
    key: 'allowGithubRegistration',
    label: 'GitHub 注册',
    description: '控制新的 GitHub 账号是否允许首次创建用户。',
  },
  {
    key: 'allowLinuxDoRegistration',
    label: 'LinuxDo 注册',
    description: '控制新的 LinuxDo 账号是否允许首次创建用户。',
  },
] as const

type RegistrationSwitchKey = (typeof registrationSwitches)[number]['key']

function shouldShowEmailServiceHint(key: RegistrationSwitchKey) {
  return key === 'allowPasswordRegistration' && !governance.emailServiceEnabled
}

function isGovernanceSwitchDisabled(key: RegistrationSwitchKey) {
  if (key === 'allowPasswordRegistration' && !governance.emailServiceEnabled) {
    return true
  }

  return savingGovernanceFields[key]
}

function handleGovernanceSwitchChange(
  key: RegistrationSwitchKey,
  value: string | number | boolean,
) {
  if (typeof value !== 'boolean') {
    return
  }

  updateGovernanceOption(key, value)
}

const summaryCards = computed(() => {
  const activeUsers = users.value.filter(user => user.status === 'ACTIVE').length
  const disabledUsers = users.value.length - activeUsers
  const systemAdmins = users.value.filter(user => user.isSystemAdmin).length

  return [
    {
      label: '用户总数',
      value: users.value.length,
      detail: `正常 ${activeUsers}，禁用 ${disabledUsers}`,
      iconCategory: SvgIconCategory.UI,
      icon: 'user-group',
    },
    {
      label: '管理员',
      value: systemAdmins,
      detail: '具备系统后台访问权限',
      iconCategory: SvgIconCategory.UI,
      icon: 'user-admin',
    },
    {
      label: '文档交互',
      value: users.value.reduce((sum, user) => sum + user.sharedDocumentCount, 0),
      detail: '全平台共享文档总数',
      iconCategory: SvgIconCategory.UI,
      icon: 'share',
    },
  ]
})

const systemAdminStatusText = computed(() => governance.systemAdminMustChangePassword ? '首次密码待修改' : '已完成首次改密')

onMounted(loadData)

function formatDate(value: string | null) {
  if (!value) {
    return '暂无'
  }

  return formatDateTime(value)
}
</script>

<template>
  <div v-loading="isLoading" class="admin-users">
    <section class="admin-users__metrics">
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

    <template v-else>
      <div class="admin-users__content">
        <ElCard shadow="never" class="border-border-a80">
          <div class="admin-users__governance">
            <div class="admin-users__governance-block">
              <div class="admin-users__section-header">
                <div>
                  <h2 class="admin-users__section-title">
                    注册治理
                  </h2>
                  <p class="admin-users__section-description">
                    切换后立即生效，只影响新注册，不影响已有账号继续登录。
                  </p>
                </div>
              </div>

              <div class="admin-users__switches">
                <label
                  v-for="item in registrationSwitches"
                  :key="item.key"
                  class="admin-users__switch-card"
                >
                  <div>
                    <span class="admin-users__switch-label">{{ item.label }}</span>
                    <p class="admin-users__switch-description">
                      {{ item.description }}
                    </p>
                  </div>
                  <div class="admin-users__switch-action">
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
                        aria-label="查看发件服务提示"
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

            <div class="admin-users__governance-block admin-users__governance-block--summary">
              <h2 class="admin-users__section-title">
                系统管理员引导状态
              </h2>
              <dl class="admin-users__admin-summary">
                <div class="admin-users__admin-summary-row">
                  <dt>管理员邮箱</dt>
                  <dd>{{ governance.systemAdminEmail }}</dd>
                </div>
                <div class="admin-users__admin-summary-row">
                  <dt>显示名称</dt>
                  <dd>{{ governance.systemAdminDisplayName || 'System Admin' }}</dd>
                </div>
                <div class="admin-users__admin-summary-row">
                  <dt>当前状态</dt>
                  <dd>{{ systemAdminStatusText }}</dd>
                </div>
                <div class="admin-users__admin-summary-row">
                  <dt>最近登录</dt>
                  <dd>{{ formatDate(governance.systemAdminLastLoginAt) }}</dd>
                </div>
                <div class="admin-users__admin-summary-row">
                  <dt>最近改密</dt>
                  <dd>{{ formatDate(governance.systemAdminPasswordUpdatedAt) }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </ElCard>

        <SystemAdminUserTable
          :updating-user-id="updatingUserId"
          :users="users"
          @toggle-status="toggleUserStatus"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.admin-users {
  padding-block: 1.5rem;

  > * + * {
    margin-top: 1.5rem;
  }

  &__metrics {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__governance {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 960px) {
      grid-template-columns: minmax(0, 1.4fr) minmax(18rem, 0.8fr);
    }
  }

  &__governance-block {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    &--summary {
      border-radius: 1rem;
      padding: 1rem;
      background: color-mix(in srgb, var(--brand-fill-lighter) 85%, transparent);
    }
  }

  &__section-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
    }
  }

  &__section-title {
    margin: 0;
    color: var(--brand-text-primary);
    font-size: 1rem;
    font-weight: 700;
  }

  &__section-description {
    margin: 0.375rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
    line-height: 1.6;
  }

  &__switches {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
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

  &__switch-action {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-shrink: 0;
  }

  &__switch-label {
    display: block;
    color: var(--brand-text-primary);
    font-size: 0.875rem;
    font-weight: 600;
  }

  &__switch-description {
    margin: 0.25rem 0 0;
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
    line-height: 1.6;
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

  &__admin-summary {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    margin: 0;
  }

  &__admin-summary-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    dt {
      color: var(--brand-text-secondary);
      font-size: 0.75rem;
    }

    dd {
      margin: 0;
      color: var(--brand-text-primary);
      font-size: 0.875rem;
      font-weight: 600;
    }
  }
}
</style>
