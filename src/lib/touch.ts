// beui.dev —— lib/touch.ts 摘录
//
// 只搬本仓库当前有消费者的那几件：TOUCH_GESTURE_CONTENT_CLASS（swipeable-list 的行面）
// 与 TOUCH_GESTURE_CLASS / capturePointer / releasePointer（wheel-picker 的鼓面）。
// 官方文件里还有 holdSelection / isHoveringPointer，没有消费者就不落盘——
// 下次真要用再补，别留死代码。

/**
 * 给"包住别人内容"的手势面用的选择抑制：列表行、sheet 头、滚动容器。
 * 只在粗指针（平台自己会跑长按选择/菜单）下关掉 user-select，鼠标仍可划词复制。
 *
 * `-webkit-touch-callout: none` 关 iOS 长按呼出（WebKit 独有，别的引擎是空规则）；
 * `pointer-coarse:select-none` 关各引擎的长按选择。
 *
 * 官方注释里点明的两个坑，移植时都成立，别再踩：
 *  - Chrome for Android 对 <a>/<img> 的长按菜单没有 CSS 能压，要自己 onContextMenu；
 *  - `-webkit-user-drag` 不继承，子元素想不被原生拖走得在它自己身上写 draggable={false}。
 */
export const TOUCH_GESTURE_CONTENT_CLASS =
  "[-webkit-touch-callout:none] pointer-coarse:select-none";

/**
 * Classes for a surface that *is* the control: a thumb, a drum, a stage, a
 * handle, a hold button. Selection is suppressed on every input, because a
 * drag that highlights the control's own label is wrong on a mouse too.
 * Compose with `touch-none` when the surface also owns the scroll axis — leave
 * it off when the page must still scroll from there.
 */
export const TOUCH_GESTURE_CLASS = "select-none [-webkit-touch-callout:none]";

/**
 * Pointer capture, best effort. WebKit throws `NotFoundError` when the pointer
 * is already gone by the time the handler runs — routine on iOS, where the
 * system can claim the touch first — and an uncaught throw takes the rest of
 * the handler, the gesture included, down with it. Touch pointers carry
 * implicit capture anyway, so losing it is never fatal.
 */
export function capturePointer(element: Element, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Pointer is no longer active — implicit capture still applies on touch.
  }
}

/** Release a capture taken with `capturePointer`, ignoring a stale pointer. */
export function releasePointer(element: Element, pointerId: number) {
  try {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {
    // Capture was already dropped by the browser.
  }
}
