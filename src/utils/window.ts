export { isWindowAlive };

/**
 * Check if the window is alive.
 * Useful to prevent opening duplicate windows.
 * 
 * This function checks:
 * 1. Window exists
 * 2. Window is not a dead wrapper (XPConnect wrapper was destroyed)
 * 3. Window is not closed
 * 
 * @param win - The window to check
 * @returns true if the window is alive and usable
 */
function isWindowAlive(win?: Window | null) {
    return win && !Components.utils.isDeadWrapper(win) && !win.closed;
}
