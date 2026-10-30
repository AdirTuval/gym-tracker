const DAY = 864e5

export const HEB_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const HEB_DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
export const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

export const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0)

/** The week starts on Sunday. */
export const startOfWeek = (t: number) => {
  const d = new Date(startOfDay(t))
  d.setDate(d.getDate() - d.getDay())
  return d.getTime()
}

export const fmtWeight = (w: number) => String(Math.round(w * 10) / 10)

export const daysAgo = (t: number, now = Date.now()) => {
  const n = Math.round((startOfDay(now) - startOfDay(t)) / DAY)
  if (n <= 0) return 'היום'
  if (n === 1) return 'אתמול'
  if (n === 2) return 'שלשום'
  return `לפני ${n} ימים`
}

export const longDate = (t: number) => {
  const d = new Date(t)
  return `יום ${HEB_DAYS[d.getDay()]}, ${d.getDate()} ב${HEB_MONTHS[d.getMonth()]}`
}

export const shortMonth = (t: number) => HEB_MONTHS[new Date(t).getMonth()].slice(0, 3) + '׳'

export const greeting = (h = new Date().getHours()) =>
  h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : 'ערב טוב'

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(x).padStart(2, '0')
}
