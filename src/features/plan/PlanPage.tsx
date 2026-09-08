import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'

/** Phase 3 占位：M5 替换为真实 Plan 页。 */
export default function PlanPage() {
  const { t } = useTranslation()
  return (
    <section aria-label={t('nav.plan')}>
      <EmptyState title={t('plan.inbox')} sub={t('common.porting')} />
    </section>
  )
}
