<script setup lang="ts">
import { useLoginView } from './composables/useLoginView'

const { providers, startLogin } = useLoginView()
</script>

<template>
  <div class="login-view">
    <ElCard shadow="never" body-class="!p-0" class="login-card">
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="login-view__panel">
          <div class="login-view__brand">
            <div class="login-view__brand-mark">
              <SvgIcon category="nav" icon="workspace" size="2.5rem" />
            </div>
            <span class="text-xl font-bold tracking-tight text-main">SamePage Docs</span>
          </div>

          <h1 class="mb-4 text-3xl font-bold text-main">
            欢迎登录
          </h1>
          <p class="mb-6 text-sm leading-6 text-secondary">
            选择 GitHub 或 LinuxDo 账号，继续访问 SamePage Docs 协作空间。
          </p>

          <div class="flex flex-col gap-4">
            <ElButton
              v-for="item in providers"
              :key="item.provider"
              class="login-provider-btn group"
              @click="startLogin(item.provider)"
            >
              <div class="login-provider-btn__leading">
                <span class="login-provider-btn__icon-wrap">
                  <SvgIcon category="ui" :icon="item.icon" size="1.125rem" class="login-provider-btn__icon" />
                </span>
                <div class="login-provider-btn__content">
                  <span class="font-semibold text-main">{{ item.title }}</span>
                  <span class="login-provider-btn__description">{{ item.description }}</span>
                </div>
              </div>
              <SvgIcon category="ui" icon="arrow-right" size="1rem" class="login-provider-btn__arrow" />
            </ElButton>
          </div>
          <p class="mt-4 text-xs text-secondary">
            首次登录会自动创建账号并同步头像信息。
          </p>
        </div>
        <div class="login-view__hero">
          <div class="login-view__hero-overlay">
            <div class="login-view__hero-orb login-view__hero-orb--top" />
            <div class="login-view__hero-orb login-view__hero-orb--bottom" />
          </div>

          <div class="login-view__hero-content">
            <div class="login-view__hero-mark">
              <SvgIcon category="nav" icon="workspace" size="5rem" />
            </div>
            <h2 class="text-2xl font-bold">
              SamePage Docs
            </h2>
          </div>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 3rem 1rem;
  background: var(--brand-bg-sidebar);

  .login-card {
    width: 100%;
    max-width: 56rem;
    overflow: hidden;
    border-color: color-mix(in srgb, var(--brand-border-base) 60%, transparent);
  }

  .login-view__panel {
    padding: 2rem;
    background: var(--brand-bg-surface);

    @media (min-width: 768px) {
      padding: 3rem;
    }

    .login-view__brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 2rem;

      .login-view__brand-mark {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
      }
    }

    .login-provider-btn {
      margin-left: 0;
      width: 100%;
      height: auto;
      position: relative;
      justify-content: flex-start;
      border-color: var(--brand-border-base);
      border-radius: 0.75rem;
      padding: 1rem 2.75rem 1rem 1rem;
      background-color: var(--brand-bg-surface);
      transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;

      &:hover {
        border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--brand-border-base));
        background-color: color-mix(in srgb, var(--brand-primary) 5%, var(--brand-bg-surface));
      }

      .login-provider-btn__leading {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .login-provider-btn__icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 2rem;
        height: 2rem;
        border-radius: 0.625rem;
        border: 1px solid color-mix(in srgb, var(--brand-border-base) 70%, transparent);
        background: color-mix(in srgb, var(--brand-primary) 4%, var(--brand-bg-surface));
      }

      .login-provider-btn__icon {
        color: var(--brand-text-primary);
      }

      .login-provider-btn__content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      }

      .login-provider-btn__description {
        margin-top: 0.25rem;
        color: var(--brand-text-secondary);
        font-size: 0.75rem;
      }

      .login-provider-btn__arrow {
        position: absolute;
        top: 50%;
        right: 1rem;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--brand-text-secondary);
        transition:
          transform 0.2s ease,
          color 0.2s ease;
      }

      &:hover .login-provider-btn__arrow {
        color: var(--brand-primary);
        transform: translate(0.25rem, -50%);
      }
    }
  }

  .login-view__hero {
    position: relative;
    display: none;
    overflow: hidden;
    padding: 3rem;
    color: #fff;
    background: var(--brand-primary);

    @media (min-width: 768px) {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .login-view__hero-overlay {
      position: absolute;
      inset: 0;
      opacity: 0.1;
    }

    .login-view__hero-orb {
      position: absolute;
      width: 16rem;
      height: 16rem;
      border-radius: 9999px;
      background: #fff;
      filter: blur(64px);

      &--top {
        top: 0;
        right: 0;
        transform: translate(50%, -50%);
      }

      &--bottom {
        bottom: 0;
        left: 0;
        transform: translate(-50%, 50%);
      }
    }

    .login-view__hero-content {
      position: relative;
      z-index: 10;
      text-align: center;
    }

    .login-view__hero-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 5rem;
      height: 5rem;
      margin: 0 auto 1.5rem;
      border-radius: 1rem;
    }
  }
}
</style>
