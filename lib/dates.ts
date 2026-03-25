/**
 * Shared date helpers — used by both the cron job and the dashboard UI.
 *
 * Centralising date logic here avoids off-by-one bugs caused by
 * time-of-day differences between server and client.
 */

/**
 * Returns the whole-number-of-days between today and the given date.
 * Both dates are normalised to start-of-day in the local timezone, so
 * the result is always a clean integer (no partial-day rounding issues).
 *
 *  0  → target is today
 *  1  → target is tomorrow
 * -1  → target was yesterday
 */
export function daysUntil(date: string | Date): number {
    const today = new Date();
    const target = new Date(date);

    const startOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
    const startOfTarget = new Date(
        target.getFullYear(),
        target.getMonth(),
        target.getDate()
    );

    const diffMs = startOfTarget.getTime() - startOfToday.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns a YYYY-MM-DD string that is `offsetDays` in the future.
 * Used by the cron job to compute the reminder target date.
 */
export function getReminderTargetDate(offsetDays = 3): string {
    const today = new Date();
    const target = new Date(today);
    target.setDate(today.getDate() + offsetDays);
    return target.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ──────────────────────────────────────────────────────────
// Self-test (runs once at import time in development only)
// ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
    const assert = (label: string, actual: number, expected: number) => {
        if (actual !== expected) {
            console.error(`[dates.ts SELF-TEST FAIL] ${label}: got ${actual}, expected ${expected}`);
        }
    };

    // Build dates relative to right now so the tests always pass
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const todayDate = new Date();
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(todayDate.getDate() + 1);
    const in3Days = new Date(todayDate);
    in3Days.setDate(todayDate.getDate() + 3);
    const yesterday = new Date(todayDate);
    yesterday.setDate(todayDate.getDate() - 1);

    assert('today', daysUntil(fmt(todayDate)), 0);
    assert('tomorrow', daysUntil(fmt(tomorrow)), 1);
    assert('in 3 days', daysUntil(fmt(in3Days)), 3);
    assert('yesterday', daysUntil(fmt(yesterday)), -1);
}
