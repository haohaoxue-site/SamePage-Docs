import type {
  HomeActivityItem,
  HomeOverviewModel,
  HomeQuickActionItem,
  HomeRecentDocument,
  HomeScheduleItem,
  HomeWidgetDefinition,
  HomeWidgetId,
} from '../typing'
import { useLocalStorage } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { listRecentDocumentNodes } from '@/apis/document'
import { useAuthStore } from '@/stores/auth'

const HOME_WIDGET_STORAGE_KEY = 'samepage_home_widgets'

const widgetDefinitions: HomeWidgetDefinition[] = [
  {
    id: 'welcome',
    title: '欢迎语',
    description: '工作区摘要与当日状态。',
  },
  {
    id: 'quick-actions',
    title: '快速操作',
    description: '高频入口和流程跳转。',
  },
  {
    id: 'recent-documents',
    title: '最近文档',
    description: '继续上次编辑上下文。',
  },
  {
    id: 'recent-activity',
    title: '最近活动',
    description: '关键协作动态与进度提醒。',
  },
  {
    id: 'schedule',
    title: '日程',
    description: '本日固定节奏与节点检查。',
  },
]

const defaultWidgetIds: HomeWidgetId[] = widgetDefinitions.map(widget => widget.id)

const quickActions: HomeQuickActionItem[] = [
  {
    id: 'open-docs',
    title: '进入文档树',
    description: '',
    icon: 'i-carbon-tree-view',
    to: '/docs',
  },
  {
    id: 'open-chat',
    title: '查看聊天助手',
    description: '',
    icon: 'i-carbon-chat-bot',
    to: '/chat',
  },
  {
    id: 'open-knowledge',
    title: '浏览知识库',
    description: '',
    icon: 'i-carbon-data-base',
    to: '/knowledge',
  },
]

const recentActivities: HomeActivityItem[] = [
  {
    id: 'activity-1',
    title: '产品简报',
    description: '',
    timeLabel: '刚刚',
  },
  {
    id: 'activity-2',
    title: '接口设计',
    description: '',
    timeLabel: '15 分钟前',
  },
  {
    id: 'activity-3',
    title: '会议纪要',
    description: '',
    timeLabel: '今天',
  },
]

const schedules: HomeScheduleItem[] = [
  {
    id: 'schedule-standup',
    timeLabel: '10:00',
    title: '团队例会',
    description: '',
  },
  {
    id: 'schedule-review',
    timeLabel: '14:30',
    title: '文档整理',
    description: '',
  },
  {
    id: 'schedule-polish',
    timeLabel: '18:00',
    title: '收尾检查',
    description: '',
  },
]

export function useHomeView() {
  const authStore = useAuthStore()
  const recentDocuments = ref<HomeRecentDocument[]>([])
  const visibleWidgetIds = useLocalStorage<HomeWidgetId[]>(HOME_WIDGET_STORAGE_KEY, [...defaultWidgetIds])

  const overview = computed<HomeOverviewModel>(() => ({
    eyebrow: '',
    title: authStore.user ? `你好，${authStore.user.displayName}` : '欢迎来到 SamePage',
    description: '',
    dateLabel: new Intl.DateTimeFormat('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(new Date()),
  }))

  const visibleWidgetSet = computed(() => new Set(visibleWidgetIds.value))
  const visibleWidgets = computed(() => widgetDefinitions.filter(widget => visibleWidgetSet.value.has(widget.id)))
  const hiddenWidgets = computed(() => widgetDefinitions.filter(widget => !visibleWidgetSet.value.has(widget.id)))

  async function loadRecentDocuments() {
    recentDocuments.value = await listRecentDocumentNodes()
  }

  function toggleWidget(widgetId: HomeWidgetId) {
    const nextWidgetIds = new Set(visibleWidgetIds.value)

    if (nextWidgetIds.has(widgetId)) {
      nextWidgetIds.delete(widgetId)
    }
    else {
      nextWidgetIds.add(widgetId)
    }

    visibleWidgetIds.value = widgetDefinitions
      .map(widget => widget.id)
      .filter(widgetIdItem => nextWidgetIds.has(widgetIdItem))
  }

  onMounted(loadRecentDocuments)

  return {
    overview,
    quickActions,
    recentActivities,
    schedules,
    recentDocuments,
    visibleWidgets,
    hiddenWidgets,
    visibleWidgetSet,
    toggleWidget,
  }
}
