'use client'

import React from 'react'
import { Calendar, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { format, parseISO, addMonths, setDate } from 'date-fns'

interface CalendarExportButtonProps {
    name: string
    cost: number
    currency: string
    renewalDate: string
    frequency: string
}

export function CalendarExportButton({ name, cost, currency, renewalDate, frequency }: CalendarExportButtonProps) {

    const safeCost = typeof cost === 'number' && !isNaN(cost)
        ? cost
        : (() => {
            const raw = String(cost).replace(/[^\d.-]/g, '');
            const parsed = parseFloat(raw);
            return isNaN(parsed) ? 0 : parsed;
        })();

    const generateICS = () => {
        const date = parseISO(renewalDate)
        const startDate = format(date, "yyyyMMdd'T'HHmmss")
        const endDate = format(date, "yyyyMMdd'T'HHmmss") // Same time for simplicity

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//RemindMyBill//Subscription Reminder//EN',
            'BEGIN:VEVENT',
            `SUMMARY:Bill Due: ${name}`,
            `DTSTART:${startDate}`,
            `DTEND:${endDate}`,
            `DESCRIPTION:Subscription bill for ${name}. Amount: ${currency}${safeCost.toFixed(2)}`,
            'STATUS:CONFIRMED',
            'SEQUENCE:0',
            'BEGIN:VALARM',
            'TRIGGER:-PT24H',
            'ACTION:DISPLAY',
            'DESCRIPTION:Reminder',
            'END:VALARM',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\n')

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
        const link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.setAttribute('download', `${name.replace(/\s+/g, '_')}_reminder.ics`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success('ICS file downloaded')
    }

    const getGoogleCalendarLink = () => {
        const date = parseISO(renewalDate)
        const formattedDate = format(date, "yyyyMMdd'T'HHmmss")
        const details = `Subscription bill for ${name}. Amount: ${currency}${safeCost.toFixed(2)}`
        const text = `Bill Due: ${name}`

        const baseUrl = 'https://calendar.google.com/calendar/render'
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: text,
            dates: `${formattedDate}/${formattedDate}`,
            details: details,
            sf: 'true',
            output: 'xml'
        })

        return `${baseUrl}?${params.toString()}`
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>Add to Calendar</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={generateICS} className="cursor-pointer">
                    <Download className="mr-2 h-4 w-4" />
                    <span>Download .ics file</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a
                        href={getGoogleCalendarLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center cursor-pointer w-full"
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <span>Google Calendar</span>
                    </a>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
