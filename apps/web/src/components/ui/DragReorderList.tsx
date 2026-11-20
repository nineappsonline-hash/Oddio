'use client';

import { useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Pointer-based drag works on touch screens as well as mouse/trackpad.
 * The grab handle owns pointer capture, so normal play/like/link clicks still work.
 * ArrowUp/ArrowDown on the handle are an accessible keyboard alternative.
 */
export function DragReorderList<T>({
  items, getId, onMove, renderItem, locale, className, disabled = false, layout = 'list',
}: {
  items: T[];
  getId: (item: T) => string;
  onMove: (from: number, to: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  locale: 'ar' | 'en';
  className?: string;
  disabled?: boolean;
  layout?: 'list' | 'grid';
}) {
  const ref = useRef<HTMLUListElement>(null);
  const pointer = useRef<{ id: number; from: number; target: number; startX: number; startY: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const ar = locale === 'ar';

  const stop = () => {
    pointer.current = null;
    setDragging(null);
    setOver(null);
  };
  function onPointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (disabled || event.button !== 0 || !event.isPrimary) return;
    pointer.current = { id: event.pointerId, from: index, target: index, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
    drag.moved = true;
    setDragging(drag.from);
    // While dragging long queues, scroll the nearest scrollable panel near its edges.
    const panel = ref.current;
    if (panel && panel.scrollHeight > panel.clientHeight) {
      const bounds = panel.getBoundingClientRect();
      if (event.clientY > bounds.bottom - 40 && event.clientY < bounds.bottom + 20) panel.scrollTop += 18;
      else if (event.clientY < bounds.top + 40 && event.clientY > bounds.top - 20) panel.scrollTop -= 18;
    }
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const row = element?.closest('[data-reorder-index]') as HTMLElement | null;
    if (!row || !ref.current?.contains(row)) return;
    const target = Number(row.dataset.reorderIndex);
    if (Number.isInteger(target) && target >= 0 && target < items.length) {
      drag.target = target;
      setOver(target);
    }
  }
  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved && drag.from !== drag.target && !disabled) {
      onMove(drag.from, drag.target);
      setAnnouncement(ar
        ? `تم نقل العنصر من رقم ${drag.from + 1} إلى رقم ${drag.target + 1}`
        : `Moved item from position ${drag.from + 1} to ${drag.target + 1}`);
    }
    stop();
  }
  return (
    <div className="min-h-0">
    <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
    <ul ref={ref} className={cn(layout === 'list' ? 'space-y-1' : 'grid', className)} aria-label={ar ? 'قائمة قابلة لإعادة الترتيب' : 'Reorderable list'}>
      {items.map((item, index) => (
        <li key={getId(item)} data-reorder-index={index}
          className={cn('flex min-w-0 items-center gap-1 rounded-xl transition-colors', dragging === index && 'bg-primary/15 opacity-70', over === index && dragging !== index && 'ring-2 ring-primary/60')}>
          <button type="button" disabled={disabled}
            aria-label={ar ? `اسحب العنصر رقم ${index + 1} لترتيبه، أو استخدم سهم فوق وتحت` : `Drag item ${index + 1} to reorder, or use arrow up/down`}
            title={ar ? 'اسحب للترتيب' : 'Drag to reorder'}
            className="grid h-11 w-9 shrink-0 touch-none cursor-grab place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-ink active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
            onPointerDown={(event) => onPointerDown(event, index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
            onKeyDown={(event) => {
              if (disabled) return;
              const to = index + (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0);
              if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && to >= 0 && to < items.length) {
                event.preventDefault();
                onMove(index, to);
                setAnnouncement(ar ? `تم نقل العنصر إلى رقم ${to + 1}` : `Moved item to position ${to + 1}`);
                // The keyed handle stays mounted and retains keyboard focus.
              }
            }}>
            <GripVertical className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
        </li>
      ))}
    </ul>
    </div>
  );
}
