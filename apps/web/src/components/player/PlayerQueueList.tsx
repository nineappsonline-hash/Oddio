'use client';

import { memo } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Artwork } from '@/components/ui/Artwork';
import { DragReorderList } from '@/components/ui/DragReorderList';
import { usePlayer } from '@/lib/player-store';

/** The large reorderable queue must not re-render when the audio clock ticks.
 * All subscriptions here are queue-related, not time-related.
 */
export const PlayerQueueList = memo(function PlayerQueueList({
  rtl,
  emptyLabel,
  removeLabel,
}: {
  rtl: boolean;
  emptyLabel: string;
  removeLabel: string;
}) {
  const queue = usePlayer((state) => state.queue);
  const jumpTo = usePlayer((state) => state.jumpTo);
  const moveInQueue = usePlayer((state) => state.moveInQueue);
  const removeFromQueue = usePlayer((state) => state.removeFromQueue);
  const reorderQueue = usePlayer((state) => state.reorderQueue);

  return (
    <>
      {queue.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-muted">
                    {emptyLabel}
                  </p>
                ) : (
                  <DragReorderList
                    items={queue}
                    getId={(item) => item.id}
                    locale={rtl ? 'ar' : 'en'}
                    onMove={reorderQueue}
                    virtualRowHeight={72}
                    className="scroll-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1"
                    renderItem={(item, index) => (
                      <div className="group flex min-w-0 items-center gap-1 rounded-xl px-1 py-1.5 hover:bg-white/5">
                        <button
                          type="button"
                          onClick={() => jumpTo(item.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <Artwork
                            title={item.title}
                            url={item.artwork.url}
                            accent={item.artwork.accent}
                            className="h-10 w-10 shrink-0"
                            rounded="rounded-lg"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">
                              {item.title}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {item.artist?.name ?? '—'}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveInQueue(item.id, 'up')}
                            aria-label={
                              rtl ? `حرّك ${item.title} لفوق` : `Move ${item.title} up`
                            }
                            title={rtl ? 'لأعلى' : 'Move up'}
                            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-25"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={index === queue.length - 1}
                            onClick={() => moveInQueue(item.id, 'down')}
                            aria-label={
                              rtl ? `حرّك ${item.title} لتحت` : `Move ${item.title} down`
                            }
                            title={rtl ? 'لأسفل' : 'Move down'}
                            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-25"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromQueue(item.id)}
                            aria-label={removeLabel}
                            title={removeLabel}
                            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  />
                )}
    </>
  );
});
