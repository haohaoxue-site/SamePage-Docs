import type {
  HomeOverviewModel,
  HomeRecentDocument,
  HomeScheduleItem,
  HomeWidgetDefinition,
  HomeWidgetId,
} from '../typing'
import { useLocalStorage } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { getRecentDocuments } from '@/apis/document'
import { useAuthStore } from '@/stores/auth'

const HOME_WIDGET_STORAGE_KEY = 'samepage_home_widgets'

const widgetDefinitions: HomeWidgetDefinition[] = [
  {
    id: 'welcome',
    title: '欢迎语',
    description: '工作区摘要与当日状态。',
  },
  {
    id: 'recent-documents',
    title: '最近文档',
    description: '继续上次编辑上下文。',
  },
  {
    id: 'schedule',
    title: '日程',
    description: '本日固定节奏与节点检查。',
  },
]

const defaultWidgetIds: HomeWidgetId[] = widgetDefinitions.map(widget => widget.id)
const validWidgetIdSet = new Set<HomeWidgetId>(defaultWidgetIds)

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
    eyebrow: 'SamePage Workspace',
    title: authStore.user ? `你好，${authStore.user.displayName}` : '欢迎来到 SamePage',
    description: '从最近文档继续推进，或者先看一眼今天的节奏安排。',
    dateLabel: new Intl.DateTimeFormat('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(new Date()),
  }))

  const visibleWidgetSet = computed(() => new Set(
    visibleWidgetIds.value.filter((widgetId): widgetId is HomeWidgetId => validWidgetIdSet.has(widgetId)),
  ))
  const visibleWidgets = computed(() => widgetDefinitions.filter(widget => visibleWidgetSet.value.has(widget.id)))

  async function loadRecentDocuments() {
    recentDocuments.value = await getRecentDocuments()
  }

  function toggleWidget(widgetId: HomeWidgetId) {
    const nextWidgetIds = new Set(visibleWidgetSet.value)

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
    schedules,
    recentDocuments,
    widgetDefinitions,
    visibleWidgets,
    visibleWidgetSet,
    toggleWidget,
  }
}
