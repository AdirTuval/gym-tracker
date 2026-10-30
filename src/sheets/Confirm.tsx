export interface ConfirmAction {
  label: string
  kind: 'primary' | 'ghost' | 'danger'
  onClick: () => void
}

export function Confirm({ title, text, actions }: { title: string; text?: string; actions: ConfirmAction[] }) {
  return (
    <>
      <div className="sheet-head">
        <div className="grow">
          <div className="h-lg">{title}</div>
          {text && <div className="eyebrow" style={{ marginTop: 4 }}>{text}</div>}
        </div>
      </div>
      <div className="sheet-foot col">
        {actions.map(a => (
          <button key={a.label} className={`btn btn-${a.kind}`} onClick={a.onClick}>{a.label}</button>
        ))}
      </div>
    </>
  )
}
