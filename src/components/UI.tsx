import { X } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { classNames } from '../lib/utils'

export function Button({ className, children, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return <button className={classNames('button', `button-${variant}`, className)} {...props}>{children}</button>
}

export function Input({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <label className="field">{label && <span>{label}</span>}<input className={classNames('input', className)} {...props} /></label>
}

export function Textarea({ label, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return <label className="field">{label && <span>{label}</span>}<textarea className={classNames('input', className)} {...props} /></label>
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return <label className="field">{label && <span>{label}</span>}<select className="input" {...props}>{children}</select></label>
}

export function Modal({ open, title, onClose, children, wide = false }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className={classNames('modal', wide && 'modal-wide')} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
      <header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tutup"><X /></button></header>{children}
    </section>
  </div>
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p></div>
}

export function Loading() { return <div className="loading"><span /><p>Membuka dunia kecil kita…</p></div> }

export function Stars({ value = 0, onChange }: { value?: number | null; onChange?: (value: number) => void }) {
  return <div className="stars" aria-label={`${value ?? 0} dari 5 bintang`}>{[1,2,3,4,5].map((star) => <button type="button" key={star} onClick={() => onChange?.(star)} className={star <= (value ?? 0) ? 'active' : ''}>★</button>)}</div>
}
