import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'

/** 设计系统目录页：M1 填充全部 ui 组件展示（仅 dev 路由，不进产品 UI）。 */
export default function StylePage() {
  const { t } = useTranslation()
  return (
    <section aria-label="style">
      <EmptyState title="Design System" sub={t('common.porting')} />
    </section>
  )
}
