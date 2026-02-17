import {
    Html, Head, Body, Container, Section,
    Img, Text, Button, Hr, Link
} from '@react-email/components';

export default function DowngradeConfirmation({
    name,
    previousTier
}: {
    name: string;
    previousTier: string;
}) {
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
                            Your Plan Has Changed
                        </Text>

                        <Text style={styles.paragraph}>
                            Hi {name},
                        </Text>

                        <Text style={styles.paragraph}>
                            Your <strong>{previousTier}</strong> subscription has ended, and your account has been switched to the <strong>Free plan</strong>.
                        </Text>

                        {/* Free Plan Box */}
                        <Section style={styles.infoBox}>
                            <Text style={styles.boxTitle}>Your Free Plan Includes:</Text>
                            <ul style={styles.featureList}>
                                <li>Track up to 7 subscriptions</li>
                                <li>3 email alerts per month</li>
                                <li>Health Score tracking</li>
                                <li>Trust Center access</li>
                            </ul>
                        </Section>

                        <Text style={styles.paragraph}>
                            We're sorry to see you go! If you'd like to regain access to unlimited tracking, advanced analytics, and all premium features, you can upgrade anytime.
                        </Text>

                        {/* CTA Button */}
                        <Button href={`${process.env.NEXT_PUBLIC_URL}/pricing`} style={styles.primaryButton}>
                            Explore Plans & Pricing
                        </Button>

                        <Text style={styles.paragraph}>
                            Thank you for being part of the RemindMyBill community. We're here if you need us!
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
    infoBox: {
        backgroundColor: '#1a3a1a',
        border: '1px solid #10b981',
        borderRadius: '12px',
        padding: '24px', // Increased padding
        margin: '24px 0'
    },
    boxTitle: {
        color: '#10b981',
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '12px',
        marginTop: 0
    },
    featureList: {
        color: '#e5e5e5',
        fontSize: '14px',
        lineHeight: '24px',
        paddingLeft: '20px',
        margin: 0
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
