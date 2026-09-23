"use client";
// beui.dev/components/motion/adaptive-stepper

import { Minus, Plus } from "lucide-react";
import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  createContext,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EASE_OUT,
  SPRING_PRESS,
} from "@/lib/ease";
import {
  Liquid,
  LiquidItem,
  type LiquidTransition,
} from "@/components/motion/liquid";
import { cn } from "@/lib/utils";

// The deliberately elastic separation curve from the liquid email reference.
const STEPPER_LIQUID_TRANSITION = {
  duration: 600,
  ease: [0.22, 1.3, 0.71, 1],
} as const satisfies LiquidTransition;

type StepDirection = -1 | 0 | 1;

type AdaptiveStepperContextValue = {
  value: number;
  valueText: string;
  direction: StepDirection;
  atMin: boolean;
  atMax: boolean;
  disabled: boolean;
  reduce: boolean;
  decrement: (restoreFocus: boolean) => void;
  increment: (restoreFocus: boolean) => void;
  // 【本地改动】官方未暴露 commit/labelId；可键入的 value 部件需要写任意值，
  // 也需要引用 <legend> 才能拿到正确的无障碍名。
  commit: (value: number, restoreFocus: boolean) => void;
  labelId: string;
  decrementRef: React.MutableRefObject<HTMLButtonElement | null>;
  incrementRef: React.MutableRefObject<HTMLButtonElement | null>;
};

const AdaptiveStepperContext = createContext<AdaptiveStepperContextValue | null>(
  null,
);

function useAdaptiveStepperContext(component: string) {
  const context = useContext(AdaptiveStepperContext);
  if (!context) {
    throw new Error(`${component} must be used within <AdaptiveStepper>`);
  }
  return context;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanNumber(value: number) {
  return Number(value.toFixed(10));
}

function nextStep(
  value: number,
  direction: -1 | 1,
  min: number,
  max: number,
  step: number,
) {
  if (direction === 1) {
    const nextIndex = Math.floor((value - min) / step + 1e-10) + 1;
    return cleanNumber(Math.min(max, min + nextIndex * step));
  }

  const previousIndex = Math.ceil((value - min) / step - 1e-10) - 1;
  return cleanNumber(Math.max(min, min + previousIndex * step));
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref && typeof ref === "object") {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    }
  };
}

export interface AdaptiveStepperProps {
  children: ReactNode;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  name?: string;
  formatValueText?: (value: number) => string;
  className?: string;
  "aria-label"?: string;
}

export function AdaptiveStepper({
  children,
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  min = 0,
  max = 10,
  step = 1,
  disabled = false,
  name,
  formatValueText,
  className,
  "aria-label": ariaLabel = "Quantity",
}: AdaptiveStepperProps) {
  const reduce = useReducedMotion() ?? false;
  const labelId = useId();
  const decrementRef = useRef<HTMLButtonElement>(null);
  const incrementRef = useRef<HTMLButtonElement>(null);
  const lower = Number.isFinite(min) ? min : 0;
  const suppliedMax = Number.isFinite(max) ? max : lower;
  const upper = suppliedMax > lower ? suppliedMax : lower;
  const stride = Number.isFinite(step) && step > 0 ? step : 1;
  const [internalValue, setInternalValue] = useState(() =>
    clamp(Number.isFinite(defaultValue) ? defaultValue : lower, lower, upper),
  );
  const controlled = controlledValue !== undefined;
  const suppliedValue = controlled ? controlledValue : internalValue;
  const currentValue = clamp(
    Number.isFinite(suppliedValue) ? suppliedValue : lower,
    lower,
    upper,
  );
  const previousValueRef = useRef(currentValue);
  const currentValueRef = useRef(currentValue);
  const direction: StepDirection =
    currentValue === previousValueRef.current
      ? 0
      : currentValue > previousValueRef.current
        ? 1
        : -1;

  useLayoutEffect(() => {
    previousValueRef.current = currentValue;
    currentValueRef.current = currentValue;
  }, [currentValue]);

  const commit = useCallback(
    (nextValue: number, restoreFocus: boolean) => {
      const next = clamp(cleanNumber(nextValue), lower, upper);
      if (next === currentValue) return;
      if (!controlled) setInternalValue(next);
      onValueChange?.(next);

      if (!restoreFocus) return;
      requestAnimationFrame(() => {
        if (next === upper && currentValueRef.current === upper) {
          decrementRef.current?.focus();
        } else if (next === lower && currentValueRef.current === lower) {
          incrementRef.current?.focus();
        }
      });
    },
    [controlled, currentValue, lower, onValueChange, upper],
  );

  const decrement = useCallback(
    (restoreFocus: boolean) => {
      if (disabled || currentValue <= lower) return;
      commit(nextStep(currentValue, -1, lower, upper, stride), restoreFocus);
    },
    [commit, currentValue, disabled, lower, stride, upper],
  );

  const increment = useCallback(
    (restoreFocus: boolean) => {
      if (disabled || currentValue >= upper) return;
      commit(nextStep(currentValue, 1, lower, upper, stride), restoreFocus);
    },
    [commit, currentValue, disabled, lower, stride, upper],
  );

  const valueText = formatValueText?.(currentValue) ?? String(currentValue);
  const context = useMemo<AdaptiveStepperContextValue>(
    () => ({
      value: currentValue,
      valueText,
      direction,
      atMin: currentValue <= lower,
      atMax: currentValue >= upper,
      disabled,
      reduce,
      decrement,
      increment,
      commit,
      labelId,
      decrementRef,
      incrementRef,
    }),
    [
      currentValue,
      decrement,
      direction,
      disabled,
      increment,
      lower,
      reduce,
      upper,
      valueText,
      commit,
      labelId,
    ],
  );

  return (
    <AdaptiveStepperContext.Provider value={context}>
      <fieldset
        disabled={disabled}
        className={cn(
          "relative isolate m-0 inline-block h-12 w-[13.5rem] border-0 p-0",
          className,
        )}
      >
        <legend id={labelId} className="sr-only">
          {ariaLabel}. Current value: {valueText}
        </legend>
        <Liquid
          blur={8}
          contrast={22}
          fill="var(--background)"
          className="size-full"
        >
          {children}
        </Liquid>
        {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      </fieldset>
    </AdaptiveStepperContext.Provider>
  );
}

export interface AdaptiveStepperActionProps
  extends Omit<HTMLMotionProps<"button">, "children" | "onClick"> {
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
}

function StepperAction({
  direction,
  children,
  className,
  onClick,
  ref,
  style,
  tabIndex,
  "aria-label": ariaLabel,
  ...props
}: AdaptiveStepperActionProps & { direction: -1 | 1 }) {
  const context = useAdaptiveStepperContext("AdaptiveStepper action");
  const hidden = direction === -1 ? context.atMin : context.atMax;
  const actionRef =
    direction === -1 ? context.decrementRef : context.incrementRef;
  const label =
    ariaLabel ?? (direction === -1 ? "Decrease value" : "Increase value");
  const action = direction === -1 ? context.decrement : context.increment;
  const x =
    direction === -1
      ? hidden
        ? 32
        : 0
      : hidden
        ? 136
        : 168;

  return (
    <LiquidItem
      x={x}
      y={0}
      width={48}
      height={48}
      radius={24}
      transition={STEPPER_LIQUID_TRANSITION}
    >
      <motion.button
        {...props}
        ref={mergeRefs(ref, actionRef)}
        type="button"
        aria-label={label}
        aria-hidden={hidden || undefined}
        tabIndex={hidden ? -1 : tabIndex}
        disabled={context.disabled || hidden}
        whileTap={
          context.reduce || context.disabled || hidden
            ? undefined
            : { scale: 0.94 }
        }
        transition={context.reduce ? { duration: 0 } : SPRING_PRESS}
        style={style}
        className={cn(
          "grid size-full place-items-center rounded-full border border-transparent bg-transparent bg-clip-padding text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
          hidden && "hover:bg-transparent",
          context.disabled && "opacity-50",
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) action(event.detail === 0);
        }}
      >
        <motion.span
          aria-hidden="true"
          initial={{
            opacity: hidden ? 0 : 1,
            filter: hidden ? "blur(2px)" : "blur(0px)",
          }}
          animate={{
            opacity: hidden ? 0 : 1,
            filter: hidden ? "blur(2px)" : "blur(0px)",
          }}
          transition={{ duration: context.reduce ? 0 : 0.15, ease: EASE_OUT }}
        >
          {children ??
            (direction === -1 ? (
              <Minus className="size-5" strokeWidth={2.5} />
            ) : (
              <Plus className="size-5" strokeWidth={2.5} />
            ))}
        </motion.span>
      </motion.button>
    </LiquidItem>
  );
}

export function AdaptiveStepperDecrement(props: AdaptiveStepperActionProps) {
  return <StepperAction {...props} direction={-1} />;
}

export interface AdaptiveStepperValueProps
  extends Omit<HTMLMotionProps<"output">, "children"> {
  children?: ReactNode | ((value: number) => ReactNode);
}

/**
 * 【本地改动】把官方写死在 AdaptiveStepperValue 里的几何表提出来，
 * 让下面新增的可键入部件共用同一组坐标——两处各抄一份魔法数字迟早会漂。
 */
function valueGeometry(atMin: boolean, atMax: boolean) {
  return atMin && atMax
    ? { x: 0, width: 216 }
    : atMin
      ? { x: 0, width: 152 }
      : atMax
        ? { x: 64, width: 152 }
        : { x: 64, width: 88 }
}

export function AdaptiveStepperValue({
  children,
  className,
  style,
  ...props
}: AdaptiveStepperValueProps) {
  const context = useAdaptiveStepperContext("AdaptiveStepperValue");
  const geometry = valueGeometry(context.atMin, context.atMax);
  const displayValue =
    typeof children === "function" ? children(context.value) : children;
  const renderedValue = displayValue ?? context.value;
  const canRoll =
    typeof renderedValue === "number" || typeof renderedValue === "string";
  const distance = context.reduce || !canRoll ? 0 : context.direction * 32;
  const enterFrom = `translateY(${distance}%)`;
  const exitTo = `translateY(${-distance}%)`;

  return (
    <LiquidItem
      x={geometry.x}
      y={0}
      width={geometry.width}
      height={48}
      radius={24}
      transition={STEPPER_LIQUID_TRANSITION}
    >
      <motion.output
        {...props}
        aria-live="polite"
        aria-atomic="true"
        style={style}
        className={cn(
          "flex size-full min-w-0 items-center justify-center overflow-hidden rounded-full border border-transparent bg-transparent bg-clip-padding px-4 text-lg font-semibold tabular-nums text-foreground",
          className,
        )}
      >
        <span className="sr-only">{context.valueText}</span>
        <span
          aria-hidden="true"
          className="relative grid min-h-[1.1em] min-w-[1ch] place-items-center overflow-hidden leading-none"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={context.value}
              initial={{
                opacity: context.reduce ? 1 : 0.35,
                filter: context.reduce ? "blur(0px)" : "blur(2px)",
                transform: enterFrom,
              }}
              animate={{
                opacity: 1,
                filter: "blur(0px)",
                transform: "translateY(0%)",
              }}
              exit={{
                opacity: context.reduce ? 1 : 0,
                filter: context.reduce ? "blur(0px)" : "blur(2px)",
                transform: exitTo,
                transition: {
                  duration: context.reduce ? 0 : 0.12,
                  ease: EASE_OUT,
                },
              }}
              transition={{
                duration: context.reduce ? 0 : 0.18,
                ease: EASE_OUT,
              }}
              className="col-start-1 row-start-1 will-change-[transform,filter,opacity]"
            >
              {renderedValue}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.output>
    </LiquidItem>
  );
}

export function AdaptiveStepperIncrement(props: AdaptiveStepperActionProps) {
  return <StepperAction {...props} direction={1} />;
}

/* ──────────────────────────────────────────────────────────────────────────
   【本地改动 / fork】官方新增部件时不会覆盖这一段，但重跑 shadcn add 会整文件
   替换，届时需要把这段和上面的 commit/labelId 暴露一起重新施加。

   为什么要加：官方只有 <AdaptiveStepperValue>，渲染成 <output>，不可键入。
   Epoch 的字段全是测量值——体重 63.4（step 0.1，从 min 30 按 ± 要 334 次）、
   静息心率 62（32 次）、步数 7342（step 500，点不出来）。± 适合数量选择器，
   不适合录入读数，所以补一个几何与官方完全一致的可键入部件。
   ────────────────────────────────────────────────────────────────────────── */

export interface AdaptiveStepperTypedValueProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {}

const NUMERIC_DRAFT = /^-?\d*[.,]?\d*$/;

function parseDraft(raw: string | null): number | null {
  if (raw === null) return null;
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "" || normalized === "-" || normalized === ".") return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function AdaptiveStepperTypedValue({
  className,
  ...props
}: AdaptiveStepperTypedValueProps) {
  const context = useAdaptiveStepperContext("AdaptiveStepperTypedValue");
  /* 聚焦期间用本地草稿：立刻 commit 会让 min/step 把输入夹掉
     （min=30 时想打 "63.4"，打到 "6" 就被夹回 30，后面全废）。 */
  const [draft, setDraft] = useState<string | null>(null);
  const geometry = valueGeometry(context.atMin, context.atMax);

  const flush = (restoreFocus: boolean): void => {
    const next = parseDraft(draft);
    if (next !== null) context.commit(next, restoreFocus);
    setDraft(null);
  };

  return (
    <LiquidItem
      x={geometry.x}
      y={0}
      width={geometry.width}
      height={48}
      radius={24}
      transition={STEPPER_LIQUID_TRANSITION}
    >
      <input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-labelledby={context.labelId}
        value={draft ?? context.valueText}
        disabled={context.disabled}
        onFocus={() => setDraft(context.valueText)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const v = event.target.value;
          if (v === "" || NUMERIC_DRAFT.test(v)) setDraft(v);
        }}
        onBlur={() => flush(false)}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") {
            event.preventDefault();
            flush(true);
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setDraft(null);
            event.currentTarget.blur();
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            context.increment(false);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            context.decrement(false);
          }
        }}
        className={cn(
          "size-full min-w-0 rounded-full border border-transparent bg-transparent bg-clip-padding px-4 text-center text-lg font-semibold tabular-nums text-foreground outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    </LiquidItem>
  );
}
