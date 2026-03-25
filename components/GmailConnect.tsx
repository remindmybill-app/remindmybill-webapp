
'use client'

import { connectGmailAccount } from '@/app/actions/gmail'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { GmailTeaserTooltip } from '@/components/gmail-teaser-tooltip'

export default function GmailConnect() {
    const [isLoading, setIsLoading] = useState(false)

    const handleConnectGmail = async () => {
        try {
            setIsLoading(true)
            await connectGmailAccount()
        } catch (error) {
            console.error('Failed to connect Gmail:', error)
            // Error handling could be improved with a toast
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <GmailTeaserTooltip>
            <Button onClick={handleConnectGmail} disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    'Connect Gmail'
                )}
            </Button>
        </GmailTeaserTooltip>
    )
}
