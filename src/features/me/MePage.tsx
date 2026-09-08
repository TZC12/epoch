import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'

/** Phase 3 占位：M5 替换为真实 Me 页。 */
export default function MePage() {
  const { t } = useTranslation()
  return (
    <section aria-label={t('nav.me')}>
      <EmptyState title={t('me.title')} sub={t('common.porting')} />
    </section>
  )
}
