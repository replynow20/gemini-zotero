export type ClosableProgressWindow = {
  startCloseTimer: (ms: number, requireMouseOver?: boolean) => unknown;
  close: () => unknown;
};

/**
 * Zotero's ProgressWindow.startCloseTimer() can sometimes be suppressed (e.g. hover).
 * This helper schedules a best-effort hard close as a fallback.
 */
export function closeProgressWindowAfter(
  win: ClosableProgressWindow,
  ms: number,
): void {
  try {
    win.startCloseTimer(ms);
  } catch {}

  try {
    Zotero.Promise.delay(ms + 50).then(() => {
      try {
        win.close();
      } catch {}
    });
  } catch {
    setTimeout(() => {
      try {
        win.close();
      } catch {}
    }, ms + 50);
  }
}
