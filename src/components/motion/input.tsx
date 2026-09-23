"use client";
// beui.dev/components/motion/input
//
// 官方原样落盘，四处 【本地改动】（标在各自位置）：
//   F1 onChange 附带原生事件（Epoch 的 26 处调用都是 (e) => set(e.target.value)，不改调用方）；
//   F2 hint 槽（官方只有 error，我们的字段普遍带一条归属提示）；
//   F3 shakeKey —— 同一个错误被再次触发时也要重抖（useFieldErr 每次 fire 自增）；
//   F4 抖出来抽成 shakeField()，让官方没有对应物的 Textarea 用同一条 tween。
// 皮肤不在这里：Epoch 的输入外观仍由 ui/field.css 决定（三处页面 CSS 也按 .field* 类名挂钩），
// 本文件只交出结构、状态机与动效。

import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type InputClassNames = {
  root?: string;
  label?: string;
  field?: string;
  input?: string;
  leftIcon?: string;
  rightIcon?: string;
  successIcon?: string;
  errorMessage?: string;
  hint?: string; /* 【本地改动】F2 */
};

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> {
  label?: string;
  value?: string;
  defaultValue?: string;
  /** 【本地改动】F1：第二个参数是原生事件，值语义不变。 */
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  /** Truthy error triggers a shake, red border and (if a string) a message. */
  error?: string | boolean;
  /** 【本地改动】F3：错误文案没变但被再次触发时，靠它重放抖动。 */
  shakeKey?: number;
  /** 【本地改动】F2：无错误时占同一条消息位（错误优先）。 */
  hint?: ReactNode;
  /** Reserve one message line so validation does not shift nearby content. */
  reserveErrorLine?: boolean;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  classNames?: InputClassNames;
}

/**
 * 【本地改动】F4：官方把抖动内联在 effect 里；抽成导出的 shakeField，
 * 让官方没有对应物的 Textarea 抖同一条 tween（同屏的 Field/Textarea 不能一个 280ms 一个 450ms）。
 * 键位与时长原样照抄官方。
 */
export function shakeField(el: HTMLElement | null, reduce: boolean | null): void {
  if (!el || reduce) return;
  animate(el, { x: [0, -6, 6, -4, 4, -2, 0] }, { duration: 0.45 });
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    value: valueProp,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    error,
    shakeKey,
    hint,
    reserveErrorLine = false,
    success,
    leftIcon,
    rightIcon,
    className,
    classNames,
    disabled,
    id: idProp,
    type,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const reduce = useReducedMotion();

  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const value = controlled ? (valueProp ?? "") : internal;

  const [focused, setFocused] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);

  const hasError = Boolean(error);
  const errorMessage = typeof error === "string" ? error : null;

  // Right edge shows the success check, otherwise the caller's right icon.
  const rightSlot = success ? null : rightIcon;

  // Shake the field when an error appears.
  useEffect(() => {
    if (!hasError) return;
    shakeField(fieldRef.current, reduce);
    /* 【本地改动】F3：shakeKey 让"同一个错误再次触发"也能重抖（useFieldErr.fire 每次自增），
       官方只依赖 hasError，第二次提交同样不合法时就不动了。 */
  }, [hasError, shakeKey, reduce]);

  const handleChange = (next: string, event: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setInternal(next);
    onChange?.(next, event); /* 【本地改动】F1 */
  };

  return (
    <div
      className={cn("flex flex-col gap-1.5", className, classNames?.root)}
    >
      {label ? (
        <label
          htmlFor={id}
          className={cn(
            "px-1 text-sm font-medium text-foreground",
            classNames?.label,
          )}
        >
          {label}
        </label>
      ) : null}

      <div
        ref={fieldRef}
        data-state={
          hasError
            ? "error"
            : success
              ? "success"
              : focused
                ? "focused"
                : "idle"
        }
        className={cn(
          "relative h-11 overflow-hidden rounded-full border transition-colors duration-200",
          "border-border",
          focused && !hasError && "border-foreground/40 ring-2 ring-ring/40",
          hasError && "border-destructive ring-2 ring-destructive/25",
          disabled && "opacity-60",
          classNames?.field,
        )}
      >
        {leftIcon ? (
          <span
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground [&_svg]:h-4 [&_svg]:w-4",
              classNames?.leftIcon,
            )}
          >
            {leftIcon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
          {...rest}
          onChange={(e) => handleChange(e.target.value, e)}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            "peer h-full w-full bg-transparent text-base leading-6 text-foreground caret-foreground outline-none",
            "placeholder:text-muted-foreground/60",
            leftIcon ? "pl-10" : "pl-3.5",
            rightSlot || success ? "pr-10" : "pr-3.5",
            disabled && "cursor-not-allowed",
            classNames?.input,
          )}
        />

        {success ? (
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            className={cn(
              "absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-(--color-success)",
              classNames?.successIcon,
            )}
          >
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </motion.svg>
        ) : rightSlot ? (
          <span
            className={cn(
              "absolute right-0 top-0 flex h-full items-center text-muted-foreground [&_button]:grid [&_button]:size-11 [&_button]:place-items-center [&_svg]:h-4 [&_svg]:w-4",
              classNames?.rightIcon,
            )}
          >
            {rightSlot}
          </span>
        ) : null}
      </div>

      <div className={reserveErrorLine ? "min-h-4" : "contents"}>
        <AnimatePresence initial={false}>
          {errorMessage ? (
            <motion.p
              id={`${id}-error`}
              role="alert"
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, y: -4, filter: "blur(4px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, y: -4, filter: "blur(4px)" }
              }
              transition={{ duration: 0.2 }}
              className={cn(
                "px-1 text-xs text-destructive",
                classNames?.errorMessage,
              )}
            >
              {errorMessage}
            </motion.p>
          ) : null}
        </AnimatePresence>
        {/* 【本地改动】F2：没有错误文案时，同一条消息位给 hint（错误优先，不并存）。 */}
        {errorMessage || !hint ? null : (
          <p className={cn("px-1 text-xs text-muted-foreground", classNames?.hint)}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
});
