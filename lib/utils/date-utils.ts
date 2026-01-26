import { parseISO, addMonths, addYears, differenceInDays } from 'date-fns';

/**
 * Calculates the next renewal date based on a start date and frequency.
 * If the date is in the past, it rolls over to the next future date.
 */
export function getNextRenewalDate(dateStr: string, frequency: string): Date {
    try {
        let date = parseISO(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // If frequency is missing, default to monthly
        const freq = frequency?.toLowerCase() || 'monthly';

        // Auto-rollover logic: keep adding cycles until the date is today or in the future
        while (date < today) {
            if (freq === 'yearly' || freq === 'annual') {
                date = addYears(date, 1);
            } else {
                // Default to monthly for anything else
                date = addMonths(date, 1);
            }
        }

        return date;
    } catch (e) {
        console.error('Error calculating next renewal date:', e);
        return new Date();
    }
}

/**
 * Formats the number of days until a date into a human-readable label and color class.
 */
export function getRenewalDisplay(date: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysLeft = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let statusColor = ""; // Default
    if (daysLeft === 0) {
        statusColor = "text-amber-500 font-bold";
    } else if (daysLeft <= 3) {
        statusColor = "text-amber-500 font-bold";
    }

    let label = `In ${daysLeft} days`;
    if (daysLeft === 0) label = "Due Today";
    if (daysLeft === 1) label = "Tomorrow";

    return { label, daysLeft, statusColor };
}
