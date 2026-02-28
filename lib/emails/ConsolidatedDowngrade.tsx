import {
    Html, Head, Body, Container, Section,
    Img, Text, Button, Hr, Link, Heading
} from '@react-email/components';
import React from 'react';

export default function ConsolidatedDowngrade({
    name,
    previousTier,
    subscriptionCount,
    remainingAlerts
}: {
    name: string;
    previousTier: string;
    subscriptionCount: number;
    remainingAlerts: number;
}) {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://remindmybill-webapp.vercel.app';
    const limit = 5;
    const needsReview = subscriptionCount > limit;

    return (
        <Html>
            <Head />
            <Body style={styles.body}>
                <Container style={styles.container}>
                    {/* Logo Header */}
                    <Section style={styles.header}>
                        <Img
                            src={`${baseUrl}/rmmb-logo.png`}
                            alt="RemindMyBill"
                            width="180"
                            height="48"
                            style={{
                                margin: '0 auto',
                                display: 'block',
                                objectFit: 'contain'
                            }}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={styles.content}>
                        <Heading style={styles.heading}>
                            Your RemindMyBill plan has been updated
                        </Heading>

                        <Text style={styles.paragraph}>
                            Hi {name},
                        </Text>

                        <Text style={styles.paragraph}>
                            Your <strong>{previousTier}</strong> subscription has ended, and your account has been transitioned to the <strong>Guardian (Free) plan</strong>.
                        </Text>

                        {/* What you lose */}
                        <Section style={styles.warningBox}>
                            <Text style={styles.boxTitle}>Plan Changes:</Text>
                            <ul style={styles.featureList}>
                                <li><strong>Analytics:</strong> Advanced spending insights are now locked.</li>
                                <li><strong>Sub Limit:</strong> Guardian accounts are limited to {limit} active subscriptions.</li>
                                <li><strong>Alert Limit:</strong> You have {remainingAlerts} email alerts remaining for this month.</li>
                            </ul>
                        </Section>

                        {needsReview ? (
                            <Section style={styles.infoBox}>
                                <Text style={styles.boxTitle}>Action Required: Select your active subscriptions</Text>
                                <Text style={styles.smallParagraph}>
                                    Currently, you have <strong>{subscriptionCount}</strong> subscriptions. Since the Guardian plan limit is <strong>{limit}</strong>, we've temporarily paused some of them.
                                </Text>
                                <Button href={`${baseUrl}/dashboard`} style={styles.primaryButton}>
                                    Log in to manage my subscriptions
                                </Button>
                            </Section>
                        ) : (
                            <Button href={`${baseUrl}/dashboard`} style={styles.primaryButton}>
                                Go to Dashboard
                            </Button>
                        )}

                        <Text style={styles.paragraph}>
                            Missed the perks of Pro? Upgrade back to <strong>Shield</strong> for unlimited everything.
                        </Text>

                        {/* Secondary CTA */}
                        <Section style={{ textAlign: 'center' as const, marginTop: '20px' }}>
                            <Link href={`${baseUrl}/pricing`} style={styles.secondaryLink}>
                                Upgrade to Shield for $4.99/mo →
                            </Link>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <Hr style={styles.hr} />
                    <Section style={styles.footer}>
                        <Text style={styles.footerText}>
                            Thank you,<br />
                            <strong>The Customer Experience Team at RemindMyBill</strong>
                        </Text>

                        <Text style={styles.footerLinks}>
                            <Link href={`${baseUrl}/privacy`} style={styles.footerLink}>
                                Privacy Policy
                            </Link>
                            {' -  '}
                            <Link href={`${baseUrl}/terms`} style={styles.footerLink}>
                                Terms & Conditions
                            </Link>
                            {' -  '}
                            <Link href={`${baseUrl}/contact`} style={styles.footerLink}>
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
        marginBottom: '32px',
        padding: '20px 0'
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
        marginTop: 0,
        textAlign: 'center' as const
    },
    paragraph: {
        color: '#e5e5e5',
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '16px'
    },
    smallParagraph: {
        color: '#e5e5e5',
        fontSize: '14px',
        lineHeight: '20px',
        marginBottom: '16px'
    },
    warningBox: {
        backgroundColor: '#2a1a1a',
        border: '1px solid #7f1d1d',
        borderRadius: '12px',
        padding: '20px',
        margin: '24px 0'
    },
    infoBox: {
        backgroundColor: '#1e1b4b',
        border: '1px solid #4338ca',
        borderRadius: '12px',
        padding: '20px',
        margin: '24px 0'
    },
    boxTitle: {
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '12px',
        marginTop: 0
    },
    featureList: {
        color: '#e5e5e5',
        fontSize: '14px',
        lineHeight: '22px',
        paddingLeft: '20px',
        margin: 0
    },
    primaryButton: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '8px',
        textDecoration: 'none',
        display: 'block',
        fontWeight: '600',
        fontSize: '16px',
        textAlign: 'center' as const,
        margin: '10px 0'
    },
    secondaryLink: {
        color: '#3b82f6',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: '15px'
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
