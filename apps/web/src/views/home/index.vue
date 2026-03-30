<script setup lang="ts">
import WorkspacePage from '@/layouts/components/WorkspacePage.vue'
import HomeQuickActionsPanel from './components/HomeQuickActionsPanel.vue'
import HomeRecentActivityPanel from './components/HomeRecentActivityPanel.vue'
import HomeSchedulePanel from './components/HomeSchedulePanel.vue'
import HomeWelcomePanel from './components/HomeWelcomePanel.vue'
import RecentDocumentList from './components/RecentDocumentList.vue'
import { useHomeView } from './composables/useHomeView'

const {
  overview,
  quickActions,
  recentActivities,
  schedules,
  recentDocuments,
  visibleWidgets,
  hiddenWidgets,
  visibleWidgetSet,
  toggleWidget,
} = useHomeView()
</script>

<template>
  <WorkspacePage>
    <template #context>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="text-2xl font-semibold tracking-tight text-main">
            主页
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <ElCheckTag
            v-for="widget in visibleWidgets"
            :key="widget.id"
            :checked="visibleWidgetSet.has(widget.id)"
            class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
            @change="toggleWidget(widget.id)"
          >
            {{ widget.title }}
          </ElCheckTag>
          <ElCheckTag
            v-for="widget in hiddenWidgets"
            :key="`hidden-${widget.id}`"
            :checked="false"
            class="rounded-full border border-dashed border-border/80 bg-white px-3 py-1.5 text-xs font-medium text-secondary transition hover:border-primary/20 hover:text-primary"
            @change="toggleWidget(widget.id)"
          >
            + {{ widget.title }}
          </ElCheckTag>
        </div>
      </div>
    </template>

    <div class="mx-auto max-w-7xl px-6 py-6">
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div class="space-y-6">
          <HomeWelcomePanel
            v-if="visibleWidgetSet.has('welcome')"
            :overview="overview"
          />

          <div class="grid gap-6 lg:grid-cols-2">
            <HomeQuickActionsPanel
              v-if="visibleWidgetSet.has('quick-actions')"
              :actions="quickActions"
            />
            <HomeSchedulePanel
              v-if="visibleWidgetSet.has('schedule')"
              :schedules="schedules"
            />
          </div>
        </div>

        <div class="space-y-6">
          <RecentDocumentList
            v-if="visibleWidgetSet.has('recent-documents')"
            :documents="recentDocuments"
          />
          <HomeRecentActivityPanel
            v-if="visibleWidgetSet.has('recent-activity')"
            :activities="recentActivities"
          />
        </div>
      </div>
    </div>
  </WorkspacePage>
</template>
