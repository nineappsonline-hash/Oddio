'use client';

import { useRef, useState, type ReactNode, type PointerEvent, type UIEvent } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Pointer-based drag works on touch screens as well as mouse/trackpad.
 * The grab handle owns pointer capture, so normal play/like/link clicks still work.
 * ArrowUp/ArrowDown on the handle are an accessible keyboard alternative.
 */
export function DragReorderList<T>({
  items,
  getId,
  onMove,
  renderItem,
  locale,
  className,
  disabled = false,
  layout = 'list',
  virtualRowHeight,
}: {
  items: T[];
  getId: (item: T) => string;
  onMove: (from: number, to: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  locale: 'ar' | 'en';
  className?: string;
  disabled?: boolean;
  layout?: 'list' | 'grid';
  virtualRowHeight?: number;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const pointer = useRef<{
    id: number;
    from: number;
    target: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [dropAllowed, setDropAllowed] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const ar = locale === 'ar';
  const virtual = layout === 'list' && Number.isFinite(virtualRowHeight)
    && (virtualRowHeight ?? 0) > 0 && items.length > 60;
  const rowHeight = virtualRowHeight ?? 76;
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);
  const overscan = 8;
  const first = virtual ? Math.max(0, Math.floor(scrollTop / rowHeight) - overscan) : 0;
  const last = virtual
    ? Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan)
    : items.length;
  const visible = items.slice(first, last);
  const onListScroll = (event: UIEvent<HTMLUListElement>) => {
    if (!virtual) return;
    setScrollTop(event.currentTarget.scrollTop);
    setViewportHeight(event.currentTarget.clientHeight);
  };
  const refocusMoved = (id: string, target: number) => {
    if (!virtual) return;
    const list = ref.current;
    if (!list) return;
    const y = target * rowHeight;
    if (y < list.scrollTop) list.scrollTop = y;
    else if (y + rowHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = y + rowHeight - list.clientHeight;
    setScrollTop(list.scrollTop);
    requestAnimationFrame(() => {
      const handle = Array.from(list.querySelectorAll<HTMLButtonElement>('button[data-drag-handle]'))
        .find((button) => button.dataset.dragHandle === id);
      handle?.focus();
    });
  };

  const stop = () => {
    pointer.current = null;
    setDragging(null);
    setOver(null);
    setDropAllowed(false);
  };
  function onPointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (disabled || event.button !== 0 || !event.isPrimary) return;
    pointer.current = {
      id: event.pointerId,
      from: index,
      target: index,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6
    )
      return;
    drag.moved = true;
    setDragging(drag.from);
    // While dragging long queues, scroll the nearest scrollable panel near its edges.
    const list = ref.current;
    // The scrollable element may be the list or a containing dialog/panel.
    let panel: HTMLElement | null = list;
    while (panel && panel.scrollHeight <= panel.clientHeight + 1)
      panel = panel.parentElement;
    if (panel && panel !== document.body && panel !== document.documentElement) {
      const bounds = panel.getBoundingClientRect();
      if (event.clientY > bounds.bottom - 48 && event.clientY < bounds.bottom + 24)
        panel.scrollTop += 20;
      else if (event.clientY < bounds.top + 48 && event.clientY > bounds.top - 24)
        panel.scrollTop -= 20;
    }
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const row = element?.closest('[data-reorder-index]') as HTMLElement | null;
    if (!row || !ref.current?.contains(row)) {
      setDropAllowed(false);
      setOver(null);
      return;
    }
    setDropAllowed(true);
    const target = Number(row.dataset.reorderIndex);
    if (Number.isInteger(target) && target >= 0 && target < items.length) {
      drag.target = target;
      setOver(target);
    }
  }
  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    const droppedElement = document.elementFromPoint(event.clientX, event.clientY);
    const droppedRow = droppedElement?.closest(
      '[data-reorder-index]',
    ) as HTMLElement | null;
    const droppedInside = Boolean(droppedRow && ref.current?.contains(droppedRow));
    // Always resolve the final drop position from the pointer-up coordinates.
    // The most recent pointer-move target can lag by one frame on touch and
    // mouse devices, especially when the list reflows while dragging.
    const target = droppedInside ? Number(droppedRow?.dataset.reorderIndex) : -1;
    if (
      drag.moved &&
      Number.isInteger(target) &&
      target >= 0 &&
      target < items.length &&
      drag.from !== target &&
      !disabled
    ) {
      onMove(drag.from, target);
      setAnnouncement(
        ar
          ? `تم نقل العنصر من رقم ${drag.from + 1} إلى رقم ${target + 1}`
          : `Moved item from position ${drag.from + 1} to ${target + 1}`,
      );
    }
    stop();
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      <ul
        ref={ref}
        onScroll={onListScroll}
        className={cn(layout === 'list' ? (virtual ? 'space-y-0' : 'space-y-1') : 'grid', className)}
        aria-label={ar ? 'قائمة قابلة لإعادة الترتيب' : 'Reorderable list'}
      >
        {virtual && first > 0 ? (
          <li aria-hidden="true" role="presentation" style={{ height: first * rowHeight }} />
        ) : null}
        {visible.map((item, offset) => {
          const index = first + offset;
          return (
          <li
            key={getId(item)}
            data-reorder-id={getId(item)}
            data-reorder-index={index}
            style={virtual ? { height: rowHeight, boxSizing: 'border-box' } : undefined}
            className={cn(
              'flex min-w-0 items-center gap-1 rounded-xl transition-colors',
              dragging === index && 'bg-primary/15 opacity-70',
              over === index &&
                dragging !== index &&
                dropAllowed &&
                'ring-2 ring-primary/60 bg-primary/[0.09]',
            )}
          >
            <button
              type="button"
              data-drag-handle={getId(item)}
              disabled={disabled}
              aria-label={
                ar
                  ? `اسحب العنصر رقم ${index + 1} لترتيبه، أو استخدم سهم فوق وتحت`
                  : `Drag item ${index + 1} to reorder, or use arrow up/down`
              }
              title={ar ? 'اسحب للترتيب' : 'Drag to reorder'}
              className="grid h-11 w-9 shrink-0 touch-none cursor-grab place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-ink active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
              onPointerDown={(event) => onPointerDown(event, index)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={stop}
              onLostPointerCapture={stop}
              onKeyDown={(event) => {
                if (disabled) return;
                const to =
                  index +
                  (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0);
                if (
                  (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
                  to >= 0 &&
                  to < items.length
                ) {
                  event.preventDefault();
                  onMove(index, to);
                  refocusMoved(getId(item), to);
                  setAnnouncement(
                    ar
                      ? `تم نقل العنصر إلى رقم ${to + 1}`
                      : `Moved item to position ${to + 1}`,
                  );
                  // The keyed handle stays mounted and retains keyboard focus.
                }
              }}
            >
              <GripVertical className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
          </li>
          );
        })}
        {virtual && last < items.length ? (
          <li aria-hidden="true" role="presentation" style={{ height: (items.length - last) * rowHeight }} />
        ) : null}
      </ul>
    </div>
  );
}
