import { useNav } from '../nav/Navigator'
import { Icon, type IconName } from '../ui/Icon'

const PLANNED: [IconName, string, string, string][] = [
  ['trend', 'התקדמות לפי תרגיל', 'משקל, חזרות ונפח לאורך זמן', '#5B8CFF'],
  ['layers', 'נפח שבועי לפי קבוצה', 'איזה שריר מקבל הכי הרבה עבודה', '#B98BFF'],
  ['trophy', 'שיאים אישיים', 'התראה כששוברים שיא', '#FFC24A'],
  ['cal', 'עקביות', 'אימונים בשבוע מול היעד של 3', '#D2FF3D'],
]

export function Analytics() {
  const nav = useNav()
  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={nav.pop} aria-label="חזרה"><Icon name="back" /></button>
        <div className="grow h-lg">נתונים וניתוח</div>
      </div>
      <div className="content">
        <div className="soon">
          <div className="ill"><Icon name="chart" size="lg" /></div>
          <div className="h-lg">בקרוב</div>
          <p>כל אימון שתתעד נשמר עם כל הפרטים,<br />כדי שכאן נוכל להראות את ההתקדמות שלך.</p>
        </div>
        <div className="plan">
          {PLANNED.map(([icon, t, s, c]) => (
            <div key={t} className="card plan-item">
              <div className="pi" style={{ color: c }}><Icon name={icon} /></div>
              <div><div className="t">{t}</div><div className="s">{s}</div></div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
