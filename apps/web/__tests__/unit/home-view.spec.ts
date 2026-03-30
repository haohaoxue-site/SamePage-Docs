import { flushPromises, mount } from '@vue/test-utils'
import { useHomeView } from '@/views/home/composables/useHomeView'

describe('homeView', () => {
  it('builds widget visibility and recent document state', async () => {
    const Probe = {
      setup() {
        return useHomeView()
      },
      template: '<div>{{ visibleWidgets.length }}-{{ recentDocuments.length }}</div>',
    }

    const wrapper = mount(Probe)
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      overview: { title: string }
      visibleWidgets: { id: string }[]
      recentDocuments: { id: string }[]
      toggleWidget: (widgetId: 'schedule') => void
      visibleWidgetSet: Set<string>
    }

    expect(vm.overview.title).toBe('欢迎来到 SamePage')
    expect(vm.visibleWidgets).toHaveLength(5)
    expect(vm.recentDocuments[0]?.id).toBe('welcome')

    vm.toggleWidget('schedule')
    expect(vm.visibleWidgetSet.has('schedule')).toBe(false)
  })
})
