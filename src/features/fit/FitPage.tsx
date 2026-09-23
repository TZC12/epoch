import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Pbar } from '@/components/ui/Pbar'
import { Row } from '@/components/ui/Row'
import { useToast } from '@/components/ui/Toast'
import { useFitWeek, useFitToday } from '@/services/queries'
import { courseById, FIT_COURSES, type FitCourse } from '@/services/fit-catalog'
import { setFitToday, logFitSession } from '@/services/actions'
import { fmtClock } from '@/lib/dates'
import '@/features/today/home.css'
import './fit-page.css'

/** 课程名/标签走 i18n：id → 词条键。 */
const NAME_KEY: Record<string, string> = {
  'hiit-fullbody': 'cHiitFullbody', 'hiit-intro': 'cHiitIntro', 'yoga-morning': 'cYogaMorning',
  'core': 'cCore', 'run-easy': 'cRunEasy', 'strength-base': 'cStrengthBase',
}

function CourseTimer({ course }: { course: FitCourse }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!running) return
    const iv = window.setInterval(() => setSec((s) => s + 1), 1000)
    return () => window.clearInterval(iv)
  }, [running])
  useEffect(() => { setRunning(false); setSec(0) }, [course.id])

  const targetSec = course.minutes * 60
  const onFinish = (): void => {
    const minutes = running || sec > 0 ? sec / 60 : course.minutes
    const s = logFitSession(course.id, minutes, course.kcal / course.minutes)
    toast(t('fit.logged', { min: s.minutes, kcal: s.kcal }), { tone: 'success' })
    setRunning(false)
    setSec(0)
  }

  return (
    <div className="fit-timer">
      <div className="fit-timer__clock tnum">{fmtClock(sec)}</div>
      <div className="fit-timer__target t-caption">
        {course.minutes} min{sec > 0 && sec < targetSec ? ` · ${t('fit.remaining')} ${fmtClock(targetSec - sec)}` : ''}
      </div>
      <div className="fit-timer__acts">
        {!running && sec === 0 && (
          <Button block onClick={() => setRunning(true)}>{t('fit.start')}</Button>
        )}
        {running && (
          <Button block variant="quiet" onClick={() => setRunning(false)}>{t('fit.stop')}</Button>
        )}
        {!running && sec > 0 && (
          <>
            <Button block variant="quiet" onClick={() => setRunning(true)}>{t('fit.start')}</Button>
            <Button block onClick={onFinish}>{t('fit.finish')}</Button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * FitPage（概念稿 page3）：本周 ink hero（kcal 大数字 + 7 日柱状 + 三格统计）→
 * 今日训练卡（所选课程 + 进度 + 实时计时结算）→ COURSES 目录（点行设为今日）。
 */
export default function FitPage() {
  const { t } = useTranslation()
  const week = useFitWeek()
  const todayView = useFitToday()
  const course = courseById(todayView.courseId)
  const maxKcal = Math.max(1, ...week.series.map((x) => x.kcal))
  const pctDone = course ? Math.min(100, Math.round((todayView.doneMin / course.minutes) * 100)) : 0

  return (
    <div className="fit">
      <header className="home-head">
        <div className="home-head__col">
          <span className="eyebrow">{t('fit.eyebrow')} · {t('fit.weekLabel')}</span>
          <h1 className="t-h1">{t('fit.title')}</h1>
        </div>
      </header>

      <section className="fit-hero" aria-label={t('fit.weekLabel')}>
        <div className="fit-hero__num">
          {week.kcal}<span className="fit-hero__unit">{t('fit.kcal')}</span>
        </div>
        <div className="fit-bars" aria-hidden="true">
          {week.series.map((d) => (
            <span key={d.date} className="fit-bars__col">
              <i style={{ height: `${Math.max(4, (d.kcal / maxKcal) * 100)}%` }} className={d.kcal > 0 ? 'on' : ''} />
            </span>
          ))}
        </div>
        <div className="fit-hero__stats">
          <span><b className="tnum">{week.kcal}</b> {t('fit.kcal')}</span>
          <span><b className="tnum">{week.minutes}</b> {t('fit.minutes')}</span>
          <span><b className="tnum">{week.days}</b> {t('fit.dayUnit')}</span>
        </div>
      </section>

      <section className="fit-today" aria-label={t('fit.todayTitle')}>
        <h2 className="eyebrow fit-sec-title">{t('fit.todayTitle')}</h2>
        {course ? (
          <>
            <div className="fit-today__head">
              <span className="t-h3">{t(`fit.${NAME_KEY[course.id]}`)}</span>
              <span className="t-caption tnum">{course.minutes} min · {course.kcal} {t('fit.kcal')}</span>
            </div>
            {todayView.doneMin > 0 && (
              <Pbar pct={pctDone} done={pctDone >= 100} label={`${todayView.doneMin}/${course.minutes}`} className="fit-today__bar" />
            )}
            <CourseTimer key={course.id} course={course} />
          </>
        ) : (
          <p className="t-small fit-today__empty">{t('fit.noCourse')}</p>
        )}
      </section>

      <section aria-label={t('fit.courses')}>
        <h2 className="eyebrow fit-sec-title">{t('fit.courses')}</h2>
        <div className="fit-courses">
          {FIT_COURSES.map((c) => {
            const active = c.id === todayView.courseId
            return (
              <Row
                key={c.id}
                title={t(`fit.${NAME_KEY[c.id]}`)}
                sub={`${c.minutes} min · ${c.kcal} ${t('fit.kcal')} · ${t(`fit.lv${c.level[0].toUpperCase()}${c.level.slice(1)}`)} · ${t(`fit.fc${c.focus[0].toUpperCase()}${c.focus.slice(1)}`)}`}
                right={active ? t('fit.todaySet') : t('fit.setToday')}
                chevron={!active}
                onClick={active ? undefined : () => setFitToday(c.id)}
                className={active ? 'fit-course--on' : ''}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}
