import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'

/** Phase 3 占位：M5 替换为真实 Progress 页。 */
export default function ProgressPage() {
  const { t } = useTranslation()
  return (
    <section aria-label={t('nav.progress')}>
      <EmptyState title={t('progress.title')} sub={t('common.porting')} />
    </section>
  )
}
