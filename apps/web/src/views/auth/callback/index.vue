<script setup lang="ts">
import { useAuthCallbackView } from './composables/useAuthCallbackView'

const { statusLabel, errorMessage } = useAuthCallbackView()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-sidebar px-4">
    <ElCard shadow="never" body-class="!p-10" class="w-full max-w-md text-center !border-none shadow-xl shadow-main/5">
      <div class="flex flex-col items-center">
        <div v-if="!errorMessage" class="w-12 h-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin mb-6" />
        <div v-else class="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-6">
          <div class="i-carbon-error" />
        </div>

        <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-2">Authentication</span>
        <h1 class="text-2xl font-bold text-main tracking-tight leading-none mb-6">
          {{ statusLabel }}
        </h1>

        <ElAlert
          v-if="errorMessage"
          class="!rounded-xl border-dashed"
          type="error"
          :title="errorMessage"
          :closable="false"
        />

        <div class="mt-8 pt-6 border-t border-border w-full flex justify-center">
          <RouterLink v-if="errorMessage" :to="{ name: 'login' }" class="w-full no-underline">
            <ElButton type="primary" class="!w-full">
              返回登录页
            </ElButton>
          </RouterLink>
          <div v-else class="text-xs text-secondary italic">
            正在为您安全跳转...
          </div>
        </div>
      </div>
    </ElCard>
  </div>
</template>
