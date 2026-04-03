import type { SvgIconCategory } from '@/components/svg-icon/typing'

/**
 * 施工中占位面板属性。
 */
export interface UnderConstructionPanelProps {
  /**
   * 标题
   * @description 面板主标题。
   */
  title: string
  /**
   * 描述
   * @description 面板补充说明文案。
   */
  description?: string
  /**
   * 图标
   * @description SVG symbol 名称。
   */
  icon?: string
  /**
   * 图标分类
   * @description 图标所在的 sprite 分类。
   */
  iconCategory?: SvgIconCategory
}
