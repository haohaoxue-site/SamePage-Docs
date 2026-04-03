<script setup lang="ts">
import { useAuthCallbackView } from './composables/useAuthCallbackView'

const { statusLabel, errorMessage } = useAuthCallbackView()
</script>

<template>
  <div class="auth-callback">
    <ElCard shadow="never" body-class="auth-callback__card-body" class="auth-callback__card">
      <div class="auth-callback__content">
        <div v-if="!errorMessage" class="auth-callback__spinner" />
        <div v-else class="auth-callback__error-mark">
          <SvgIcon category="ui" icon="error" size="1.5rem" />
        </div>

        <span class="auth-callback__eyebrow">Authentication</span>
        <h1 class="auth-callback__title">
          {{ statusLabel }}
        </h1>

        <ElAlert
          v-if="errorMessage"
          class="auth-callback__alert"
          type="error"
          :title="errorMessage"
          :closable="false"
        />

        <div class="auth-callback__footer">
          <RouterLink v-if="errorMessage" :to="{ name: 'login' }" class="auth-callback__back-link">
            <ElButton type="primary" class="auth-callback__back-button">
              返回登录页
            </ElButton>
          </RouterLink>
          <div v-else class="auth-callback__hint">
            正在为您安全跳转...
          </div>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding-inline: 1rem;
  background: var(--brand-bg-sidebar);

  .auth-callback__card {
    width: 100%;
    max-width: 28rem;
    text-align: center;
    border: none;
    box-shadow: 0 20px 25px -5px color-mix(in srgb, var(--brand-text-primary) 5%, transparent);
  }

  :deep(.auth-callback__card-body) {
    padding: 2.5rem !important;
  }

  .auth-callback__content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .auth-callback__spinner {
    margin-bottom: 1.5rem;
    width: 3rem;
    height: 3rem;
    border-radius: 9999px;
    border: 3px solid color-mix(in srgb, var(--brand-primary) 20%, transparent);
    border-top-color: var(--brand-primary);
    animation: auth-callback-spin 1s linear infinite;
  }

  .auth-callback__error-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: 1.5rem;
    border-radius: 9999px;
    color: var(--brand-error);
    font-size: 1.5rem;
    background: color-mix(in srgb, var(--brand-error) 10%, transparent);
  }

  .auth-callback__eyebrow {
    margin-bottom: 0.5rem;
    color: var(--brand-text-secondary);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .auth-callback__title {
    margin-bottom: 1.5rem;
    color: var(--brand-text-primary);
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.025em;
  }

  .auth-callback__alert {
    border-style: dashed;
    border-radius: 0.75rem !important;
  }

  .auth-callback__footer {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--brand-border-base);
  }

  .auth-callback__back-link {
    width: 100%;
    text-decoration: none;
  }

  .auth-callback__back-button {
    width: 100% !important;
  }

  .auth-callback__hint {
    color: var(--brand-text-secondary);
    font-size: 0.75rem;
    font-style: italic;
  }
}

@keyframes auth-callback-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
