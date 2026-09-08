import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import './field.css'

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string                 /* 显式 label——placeholder 不再当 label（审计 §13.3） */
  hint?: string
  error?: string
  className?: string
}

/** 输入域：sunken 底 + 无边框；focus 描边 --ink；error 描边 --danger。 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, className = '', id, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const cls = ['field', error ? 'field--error' : '', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {label && (
        <label className="field__label eyebrow" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <input ref={ref} id={fieldId} className="field__input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-err` : undefined} {...rest} />
      {error ? (
        <p className="field__err" id={`${fieldId}-err`} role="alert">{error}</p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  )
})

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string
  hint?: string
  error?: string
  rows?: number
  className?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, rows = 3, className = '', id, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const cls = ['field', error ? 'field--error' : '', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {label && (
        <label className="field__label eyebrow" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <textarea ref={ref} id={fieldId} rows={rows} className="field__input field__textarea" aria-invalid={error ? true : undefined} {...rest} />
      {error ? (
        <p className="field__err" role="alert">{error}</p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  )
})
