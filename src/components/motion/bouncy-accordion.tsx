"use client";
// beui.dev/components/motion/bouncy-accordion

import {
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type BouncyAccordionItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  /**
   * 【本地改动 / fork】官方每一项都必须可展开；Epoch 的设置分组里天然混着
   * "能展开的"和"点一下跳走的"（健康 / AI 接口 / 退出登录）。给了 onClick
   * 就渲染成动作行：不声明 aria-expanded、没有面板、箭头朝右不旋转。
   * 重跑 shadcn add 会整文件替换，这处与下面的 isAction 分支要一起重新施加。
   */
  onClick?: () => void;
};

export type BouncyAccordionClassNames = {
  root?: string;
  item?: string;
  trigger?: string;
  icon?: string;
  title?: string;
  chevron?: string;
  content?: string;
  description?: string;
};

export interface BouncyAccordionProps {
  items: BouncyAccordionItem[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  collapsible?: boolean;
  className?: string;
  classNames?: BouncyAccordionClassNames;
}

// Local springs keep the accordion's connected groups moving together while
// avoiding scale projection on text-heavy row contents.
// Gap spring: must not overshoot y — positive y overshoot drifts items below
// their mt-3 resting point and briefly overlaps the next item.
const ROW_TRANSITION: Transition = {
  type: "spring",
  duration: 0.55,
  bounce: 0.38,
};

const CONTENT_OPEN_TRANSITION: Transition = {
  type: "spring",
  duration: 0.58,
  bounce: 0.32,
};

const CONTENT_CLOSE_TRANSITION: Transition = {
  type: "spring",
  duration: 0.46,
  bounce: 0.26,
};

/**
 * 【本地改动】官方写死 28px，比我们的卡片圆角大一档。统一取 --r-lg = 22px，
 * 让手风琴卡片和方向卡、Sheet、输入控件同一档。
 * 只能写数字不能写 var(--r-lg)：motion 要插值数值，CSS 变量在这里不参数字动画。
 * 改 tokens.css 的 --r-lg 时记得同步这里。
 */
const CARD_RADIUS = 22;

const DESCRIPTION_TRANSITION: Transition = {
  duration: 0.18,
  ease: EASE_OUT,
};

const CHEVRON_TRANSITION: Transition = {
  type: "spring",
  duration: 0.42,
  bounce: 0.28,
};


function useControllableAccordionValue({
  value,
  defaultValue,
  onValueChange,
}: {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? null);
  const isControlled = value !== undefined;
  const currentValue = value ?? internalValue;

  const setValue = useCallback(
    (next: string | null) => {
      if (!isControlled) {
        setInternalValue(next);
      }

      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return [currentValue, setValue] as const;
}

function BouncyAccordionRow({
  item,
  open,
  startsGroup,
  endsGroup,
  separatedFromPrevious,
  contentId,
  triggerId,
  reduce,
  classNames,
  onToggle,
}: {
  item: BouncyAccordionItem;
  open: boolean;
  startsGroup: boolean;
  endsGroup: boolean;
  separatedFromPrevious: boolean;
  contentId: string;
  triggerId: string;
  reduce: boolean | null;
  classNames?: BouncyAccordionClassNames;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  /* 【本地改动】见 BouncyAccordionItem.onClick —— 动作行不开面板 */
  const isAction = typeof item.onClick === "function";

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const updateHeight = () => {
      setContentHeight(node.offsetHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <motion.div
      layout="position"
      initial={false}
      style={{ marginTop: separatedFromPrevious ? 12 : 0 }}
      transition={reduce ? { duration: 0 } : ROW_TRANSITION}
    >
      <motion.div
        data-state={open ? "open" : "closed"}
        initial={false}
        animate={{
          borderTopLeftRadius: startsGroup ? CARD_RADIUS : 0,
          borderTopRightRadius: startsGroup ? CARD_RADIUS : 0,
          borderBottomLeftRadius: endsGroup ? CARD_RADIUS : 0,
          borderBottomRightRadius: endsGroup ? CARD_RADIUS : 0,
        }}
        transition={reduce ? { duration: 0 } : ROW_TRANSITION}
        className={cn(
          "overflow-hidden bg-card text-card-foreground",
          item.disabled && "opacity-50",
          classNames?.item,
        )}
      >
        <button
          id={triggerId}
          type="button"
          disabled={item.disabled}
          aria-expanded={isAction ? undefined : open}
          aria-controls={isAction ? undefined : contentId}
          onClick={isAction ? item.onClick : onToggle}
          className={cn(
            /* 【本地改动】官方没写 border-0/bg-transparent——它假定有 Tailwind preflight
               清掉 button 的 UA 样式。我们刻意不引 preflight（会和 global.css 自带的
               最小 reset 打架、把未迁移组件集体改样），所以在第三方层自己补这一条。
               不补的话每行都会带一圈 UA 的 2px outset 黑边。 */
            "border-0 bg-transparent",
            "flex min-h-[54px] w-full items-center gap-4 px-5 text-left outline-none transition-colors",
            "focus-visible:bg-muted/25",
            "disabled:pointer-events-none",
            classNames?.trigger,
          )}
        >
          {item.icon ? (
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center text-muted-foreground",
                classNames?.icon,
              )}
            >
              {item.icon}
            </span>
          ) : null}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[15px] font-medium text-foreground",
              classNames?.title,
            )}
          >
            {item.title}
          </span>
          {isAction ? (
            /* 【本地改动】动作行：箭头朝右且不旋转，与 App 其它可点行同一语言 */
            <span
              aria-hidden
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center text-muted-foreground",
                classNames?.chevron,
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <motion.span
              aria-hidden
              animate={{ rotate: open ? 180 : 0 }}
              transition={reduce ? { duration: 0 } : CHEVRON_TRANSITION}
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center text-muted-foreground",
                classNames?.chevron,
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          )}
        </button>

        {!isAction && (
        <motion.div
          layout="size"
          id={contentId}
          role="region"
          aria-labelledby={triggerId}
          aria-hidden={!open}
          inert={!open}
          initial={false}
          style={{ height: open && item.description ? contentHeight : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : open
                ? CONTENT_OPEN_TRANSITION
                : CONTENT_CLOSE_TRANSITION
          }
          className={cn("overflow-hidden", classNames?.content)}
        >
          <motion.div
            ref={contentRef}
            animate={{
              opacity: open ? 1 : 0,
            }}
            transition={reduce ? { duration: 0 } : DESCRIPTION_TRANSITION}
            className="px-5 pb-5"
          >
            <div
              className={cn(
                "text-[15px] leading-6 text-muted-foreground",
                classNames?.description,
              )}
            >
              {item.description}
            </div>
          </motion.div>
        </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function BouncyAccordion({
  items,
  value,
  defaultValue = null,
  onValueChange,
  collapsible = true,
  className,
  classNames,
}: BouncyAccordionProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [activeValue, setActiveValue] = useControllableAccordionValue({
    value,
    defaultValue,
    onValueChange,
  });
  const activeIndex = items.findIndex((item) => item.id === activeValue);

  const toggleItem = useCallback(
    (id: string) => {
      if (activeValue === id) {
        if (collapsible) {
          setActiveValue(null);
        }
        return;
      }

      setActiveValue(id);
    },
    [activeValue, collapsible, setActiveValue],
  );

  return (
    <div className={cn("w-full", className, classNames?.root)}>
      {items.map((item, index) => {
        /* 【本地改动】动作行永远不参与展开，避免受控 value 指到它时把分组圆角打断 */
        const open = activeValue === item.id && typeof item.onClick !== "function";
        const previousIsOpen = activeIndex === index - 1;
        const nextIsOpen = activeIndex === index + 1;
        const startsGroup = open || index === 0 || previousIsOpen;
        const endsGroup = open || index === items.length - 1 || nextIsOpen;
        const separatedFromPrevious = index > 0 && (open || previousIsOpen);
        const contentId = `${baseId}-${item.id}-content`;
        const triggerId = `${baseId}-${item.id}-trigger`;

        return (
          <BouncyAccordionRow
            key={item.id}
            item={item}
            open={open}
            startsGroup={startsGroup}
            endsGroup={endsGroup}
            separatedFromPrevious={separatedFromPrevious}
            contentId={contentId}
            triggerId={triggerId}
            reduce={reduce}
            classNames={classNames}
            onToggle={() => toggleItem(item.id)}
          />
        );
      })}
    </div>
  );
}
