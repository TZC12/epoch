import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { useReducedMotion } from 'motion/react'
import { Input, shakeField } from '@/components/motion/input'
import { cn } from '@/lib/utils'
import './field.css'

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string                 /* 显式 label——placeholder 不再当 label（审计 §13.3） */
  hint?: string
  error?: string
  shakeKey?: number              /* 错误抖动：配合 useFieldErr 使用 */
  className?: string
  trailing?: ReactNode           /* 尾部控件槽（如密码可见切换）；有值时输入自动让出右内距 */
}

/**
 * 输入域：外观**照官方 @beui/input 原样用**（胶囊描边 + 焦点 ring + 错误抖动 + 文案进出场）。
 *
 * 这里只留三个"标记类"，不带任何样式：
 *  - .field：整行根（task-sheet / learn-page 的页面级规则按它命中）；
 *  - .field__input：给 TaskSheet 的大号标题输入这类**页面级特例**挂钩；
 *  - .field__err：learn-page 用 `.field:not(:has(.field__err))::after` 占一条消息位，
 *    靠这个类判断"这行现在有没有报错"。
 * 官方没有 textarea 版本，所以下面 Textarea 仍由 field.css 画皮（按官方同一套语言写）。
 */
const toText = (v: InputHTMLAttributes<HTMLInputElement>['value']): string | undefined =>
  v == null ? undefined : Array.isArray(v) ? v.join(',') : String(v)

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, shakeKey, className = '', trailing, id, value, defaultValue, onChange, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      id={id}
      label={label}
      hint={hint}
      error={error}
      shakeKey={shakeKey}
      value={toText(value)}
      defaultValue={toText(defaultValue)}
      /* 官方给的是 (value, event)；Epoch 的调用方一直是原生事件签名。
         onChange 必须从 rest 里解构出来，否则 {...rest} 会把这一行盖掉。 */
      onChange={(_, event) => onChange?.(event)}
      rightIcon={trailing}
      className={cn('field', className)}
      classNames={{
        /* border-0 bg-transparent = preflight 补偿。官方按 Tailwind preflight 写，
           我们不引整套（会把已迁移组件集体改样），但表单控件的 UA 2px inset 边框
           必须自己抹掉，否则它会在官方胶囊里露出一圈斜边。 */
        input: 'field__input border-0 bg-transparent',
        /* 尾部槽里的裸 <button>（如密码眼睛）同样要吃 preflight 那一条归零；
           官方只负责尺寸与位置（[&_button]:size-11 …），不画皮。 */
        rightIcon: trailing ? '[&_button]:border-0 [&_button]:bg-transparent' : undefined,
        errorMessage: 'field__err',
      }}
      {...rest}
    />
  )
})

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string
  hint?: string
  error?: string
  shakeKey?: number
  rows?: number
  className?: string
}

/** 官方没有 textarea 版本；这里保持我们的实现，但抖动改用官方那条 tween（shakeField），
 *  免得同屏的 Field 与 Textarea 一个 280ms 一个 450ms。 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, shakeKey, rows = 3, className = '', id, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const reduce = useReducedMotion()
  const ownRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    if (shakeKey) shakeField(ownRef.current, reduce)
  }, [shakeKey, reduce])

  const cls = ['field', error ? 'field--error' : '', className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {label && (
        <label className="field__label eyebrow" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <textarea
        ref={(node) => {
          ownRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        id={fieldId}
        rows={rows}
        className="field__textarea"
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? (
        <p className="field__err" role="alert">{error}</p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  )
})
