<script setup lang="ts">
import { useLoginView } from './composables/useLoginView'

const { providers, startLogin } = useLoginView()
</script>

<template>
  <div class="min-h-screen bg-sidebar flex items-center justify-center px-4 py-12">
    <ElCard shadow="never" body-class="!p-0" class="w-full max-w-4xl overflow-hidden border-border/60 shadow-2xl">
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="p-8 md:p-12 bg-white">
          <div class="flex items-center gap-2 mb-8">
            <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">
              S
            </div>
            <span class="text-xl font-bold tracking-tight text-main">SamePage Docs</span>
          </div>

          <h1 class="text-3xl font-bold text-main mb-4">
            系统登录
          </h1>

          <div class="flex flex-col gap-4">
            <ElButton
              v-for="item in providers"
              :key="item.provider"
              class="group login-provider-btn !ml-0 !h-auto !w-full !justify-between !rounded-xl !border-border !bg-white !p-4 hover:!border-primary/40 hover:!bg-primary/5"
              @click="startLogin(item.provider)"
            >
              <div class="flex flex-col items-start">
                <span class="font-semibold text-main">{{ item.title }}</span>
                <span class="text-xs text-secondary mt-1">{{ item.description }}</span>
              </div>
              <div class="i-carbon-arrow-right text-secondary group-hover:text-primary transition-transform group-hover:translate-x-1" />
            </ElButton>
          </div>
        </div>
        <div class="hidden md:flex flex-col items-center justify-center p-12 bg-primary text-white relative overflow-hidden">
          <div class="absolute inset-0 opacity-10">
            <div class="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div class="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl" />
          </div>

          <div class="relative z-10 text-center">
            <div class="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl font-bold mb-6 mx-auto">
              S
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
