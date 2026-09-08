import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'

/** Phase 3 占位：M4 替换为真实 Today 页。 */
export default function TodayPage() {
  const { t } = useTranslation()
  return (
    <section aria-label={t('nav.today')}>
      <EmptyState title={t('today.greeting')} sub={t('common.porting')} />
    </section>
  )
}
