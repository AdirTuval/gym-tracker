import { lastBackupAt } from '../db/backup'
import { GROUPS } from '../db/catalog'
import { useHomeData } from '../db/queries'
import { startWorkout } from '../db/workout'
import { daysAgo, greeting, HEB_DAY_LETTERS, HEB_DAYS, longDate, shortMonth } from '../lib/format'
import { useNav } from '../nav/Navigator'
import { Elapsed } from '../ui/Elapsed'
import { Icon } from '../ui/Icon'

const WEEKLY_GOAL = 3
const RING_C = 2 * Math.PI * 34
const BACKUP_EVERY_DAYS = 14

export function Home() {
  const nav = useNav()
  const data = useHomeData()
  const weekCount = data?.weekCount ?? 0
  const weekDays = data?.weekDays ?? new Set<number>()
  const recent = data?.recent ?? []
  const today = new Date().getDay()
  const left = WEEKLY_GOAL - weekCount
  const active = data?.active
  const lastBackup = lastBackupAt()
  const backupDue = (data?.finishedWorkouts ?? 0) > 0 && (!lastBackup || Date.now() - lastBackup > BACKUP_EVERY_DAYS * 864e5)

  async function onHero() {
    const workoutId = active?.workout.id ?? (await startWorkout())
    nav.push('workout', { workoutId })
  }

  return (
    <>
      <div className="topbar">
        <div className="grow">
          <div className="eyebrow">{longDate(Date.now())}</div>
          <div className="h-xl">{greeting()}</div>
        </div>
        <button className="icon-btn" onClick={() => nav.push('settings')} aria-label="הגדרות"><Icon name="sliders" /></button>
      </div>

      <div className="content">
        <section className="card week">
          <div className="week-head">
            <div>
              <div className="eyebrow">יעד שבועי</div>
              <div className="big">{weekCount}<span>/{WEEKLY_GOAL}</span></div>
              <div className="sub">
                {left > 0 ? `אימונים השבוע · עוד ${left === 1 ? 'אחד' : left} ליעד` : 'עמדת ביעד השבועי 🎉'}
              </div>
            </div>
            <div className="ring">
              <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
                <circle cx="42" cy="42" r="34" fill="none" stroke="var(--surface-2)" strokeWidth="9" />
                <circle cx="42" cy="42" r="34" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - Math.min(1, weekCount / WEEKLY_GOAL))}
                  style={{ transition: 'stroke-dashoffset .8s var(--ease)' }} />
              </svg>
              <div className="ring-label"><Icon name="flame" size="lg" /></div>
            </div>
          </div>
          <div className="days">
            {HEB_DAY_LETTERS.map((l, i) => (
              <div key={i} className={`day ${weekDays.has(i) ? 'done' : ''} ${i === today ? 'today' : ''}`}>
                {l}
                <div className="dot">{weekDays.has(i) && <Icon name="check" size="sm" />}</div>
              </div>
            ))}
          </div>
        </section>

        <button className="hero pressable" onClick={onHero}>
          <svg className="rings" viewBox="0 0 200 200" fill="none" stroke="#0D1003" strokeWidth="10" aria-hidden="true">
            <circle cx="100" cy="100" r="40" /><circle cx="100" cy="100" r="70" /><circle cx="100" cy="100" r="100" />
          </svg>
          {active ? (
            <div>
              <div className="hero-eyebrow">אימון פעיל</div>
              <div className="hero-title">המשך אימון</div>
              <div className="hero-sub">{active.groups.length} מתוך 6 קבוצות · <Elapsed since={active.workout.startedAt} /></div>
            </div>
          ) : (
            <div>
              <div className="hero-eyebrow">FULL BODY</div>
              <div className="hero-title">התחל אימון</div>
              <div className="hero-sub">6 קבוצות שרירים · ~60 דק׳</div>
            </div>
          )}
          {!active && recent[0] && (
            <div className="chip hero-chip">
              <Icon name="clock" size="sm" /> אימון אחרון {daysAgo(recent[0].workout.startedAt)}
            </div>
          )}
          <div className="hero-go"><Icon name="play" size="lg" /></div>
        </button>

        {backupDue && (
          <button className="card nav-card pressable backup-due" onClick={() => nav.push('settings')}>
            <div className="nav-ic"><Icon name="shield" /></div>
            <div style={{ flex: 1 }}>
              <div className="t">{lastBackup ? `הגיבוי האחרון ${daysAgo(lastBackup)}` : 'כדאי לגבות את הנתונים'}</div>
              <div className="s">הנתונים שמורים רק בטלפון</div>
            </div>
            <span className="chev"><Icon name="chevL" /></span>
          </button>
        )}

        <button className="card nav-card pressable" onClick={() => nav.push('analytics')}>
          <div className="nav-ic"><Icon name="chart" /></div>
          <div style={{ flex: 1 }}>
            <div className="t">נתונים וניתוח</div>
            <div className="s">התקדמות, שיאים ומגמות</div>
          </div>
          <span className="chip accent">בקרוב</span>
        </button>

        <div className="section-title">
          אימונים אחרונים {recent.length > 0 && <small>{recent.length} אימונים</small>}
        </div>
        {recent.length === 0 ? (
          <div className="card empty-card">
            <Icon name="cal" />
            <div>
              <div className="t">עוד אין אימונים</div>
              <div className="s">אחרי האימון הראשון הוא יופיע כאן</div>
            </div>
          </div>
        ) : (
          <div className="recent">
            {recent.map(r => {
              const d = new Date(r.workout.startedAt)
              return (
                <div key={r.workout.id} className="card rw">
                  <div className="rw-date"><b>{d.getDate()}</b><span>{shortMonth(r.workout.startedAt)}</span></div>
                  <div className="rw-mid">
                    <div className="t">יום {HEB_DAYS[d.getDay()]}</div>
                    <div className="s">
                      {[`${r.durationMin} דק׳`, `${r.exerciseCount} תרגילים`, ...r.extras].join(' · ')}
                    </div>
                    <div className="dots">
                      {GROUPS.map(g => <i key={g.id} style={r.groups.includes(g.id) ? { background: g.color } : undefined} />)}
                    </div>
                  </div>
                  <div className="rw-vol"><b>{(r.volume / 1000).toFixed(1)}k</b><span>ק״ג נפח</span></div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
