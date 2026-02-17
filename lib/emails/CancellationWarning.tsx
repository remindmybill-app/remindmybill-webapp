import {
    Html, Head, Body, Container, Section,
    Img, Text, Button, Hr, Link
} from '@react-email/components';

export default function CancellationWarning({
    name,
    tier,
    cancellationDate,
    reactivationToken
}: {
    name: string;
    tier: string;
    cancellationDate: Date;
    reactivationToken: string;
}) {
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
    }).format(cancellationDate);

    const daysRemaining = Math.max(0, Math.ceil(
        (cancellationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ));

    const reactivationUrl = `${process.env.NEXT_PUBLIC_URL}/reactivate?token=${reactivationToken}`;

    return (
        <Html>
            <Head />
            <Body style={styles.body}>
                <Container style={styles.container}>
                    {/* Logo Header */}
                    <Section style={styles.header}>
                        <Img
                            src={`${process.env.NEXT_PUBLIC_URL}/rmmb-logo.png`}
                            alt="RemindMyBill"
                            width="150"
                            height="40"
                            style={styles.logo}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={styles.content}>
                        <Text style={styles.heading}>
                            Subscription Cancellation Scheduled
                        </Text>

                        <Text style={styles.paragraph}>
                            Hi {name},
                        </Text>

                        <Text style={styles.paragraph}>
                            We've received your request to cancel your <strong>{tier}</strong> subscription.
                        </Text>

                        {/* Countdown Box */}
                        <Section style={styles.countdownBox}>
                            <Text style={styles.countdownLabel}>
                                ⏰ Your access will end on:
                            </Text>
                            <Text style={styles.countdownDate}>
                                {formattedDate}
                            </Text>
                            <Text style={styles.countdownDays}>
                                You have <strong>{daysRemaining} days</strong> remaining
                            </Text>
                        </Section>

                        <Text style={styles.paragraph}>
                            After this date, your account will automatically switch to the <strong>Free plan</strong>.
                            You'll still be able to track up to 7 subscriptions with limited alerts.
                        </Text>

                        <Text style={styles.paragraph}>
                            <strong>Changed your mind?</strong>
                        </Text>

                        {/* Primary CTA Button */}
                        <Button href={reactivationUrl} style={styles.primaryButton}>
                            Keep My {tier} Subscription
                        </Button>

                        <Text style={styles.smallText}>
                            If the button doesn't work, copy and paste this link:<br />
                            <Link href={reactivationUrl} style={styles.link}>
                                {reactivationUrl}
                            </Link>
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Hr style={styles.hr} />
                    <Section style={styles.footer}>
                        <Text style={styles.footerText}>
                            Thank you,<br />
                            <strong>The Customer Experience Team at RemindMyBill</strong>
                        </Text>

                        <Text style={styles.footerLinks}>
                            <Link href={`${process.env.NEXT_PUBLIC_URL}/privacy`} style={styles.footerLink}>
                                Privacy Policy
                            </Link>
                            {' -  '}
                            <Link href={`${process.env.NEXT_PUBLIC_URL}/terms`} style={styles.footerLink}>
                                Terms & Conditions
                            </Link>
                            {' -  '}
                            <Link href={`${process.env.NEXT_PUBLIC_URL}/contact`} style={styles.footerLink}>
                                Contact Us
                            </Link>
                        </Text>

                        <Text style={styles.footerNote}>
                            RemindMyBill -  Never lose money on forgotten subscriptions
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const styles = {
    body: {
        backgroundColor: '#0a0a0a',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0
    },
    container: {
        margin: '0 auto',
        padding: '40px 20px',
        maxWidth: '600px'
    },
    header: {
        textAlign: 'center' as const,
        marginBottom: '32px'
    },
    logo: {
        margin: '0 auto'
    },
    content: {
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '32px'
    },
    heading: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: '24px',
        marginTop: 0
    },
    paragraph: {
        color: '#e5e5e5',
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '16px'
    },
    countdownBox: {
        backgroundColor: '#1e3a8a',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center' as const,
        margin: '24px 0'
    },
    countdownLabel: {
        color: '#93c5fd',
        fontSize: '14px',
        marginBottom: '8px',
        marginTop: 0
    },
    countdownDate: {
        color: '#ffffff',
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '8px',
        marginTop: 0
    },
    countdownDays: {
        color: '#93c5fd',
        fontSize: '14px',
        marginTop: 0,
        marginBottom: 0
    },
    primaryButton: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        padding: '14px 28px',
        borderRadius: '8px',
        textDecoration: 'none',
        display: 'inline-block',
        fontWeight: '600',
        fontSize: '16px',
        margin: '20px 0',
        textAlign: 'center' as const
    },
    smallText: {
        color: '#999',
        fontSize: '12px',
        lineHeight: '18px',
        marginTop: '16px'
    },
    link: {
        color: '#3b82f6',
        textDecoration: 'underline',
        wordBreak: 'break-all' as const
    },
    hr: {
        borderColor: '#333',
        margin: '32px 0'
    },
    footer: {
        textAlign: 'center' as const
    },
    footerText: {
        color: '#999',
        fontSize: '14px',
        lineHeight: '22px'
    },
    footerLinks: {
        color: '#666',
        fontSize: '12px',
        marginTop: '16px'
    },
    footerLink: {
        color: '#3b82f6',
        textDecoration: 'none'
    },
    footerNote: {
        color: '#666',
        fontSize: '12px',
        marginTop: '16px'
    }
};
