/* MorphIcons 用 Lucide IconNode 数据（§组件架构：唯一图标族=Lucide，morph 只做状态形变）。
   节点数据取自 Lucide 官方源码（ISC License，https://lucide.dev）——lucide-react 组件不暴露 iconNode，
   此处按 morphicons 文档认可的「自定义节点」方式精抄三枚我们用到的状态对端点。 */
import type { IconNode } from 'morphicons'

export const circleNode: IconNode = [['circle', { cx: '12', cy: '12', r: '10' }]]
export const checkNode: IconNode = [['path', { d: 'M20 6 9 17l-5-5' }]]
export const squareNode: IconNode = [['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2' }]]
