import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Img,
    Text,
    Button,
    Hr,
    Link,
} from "@react-email/components";
import * as React from "react";

interface PaymentFailedProps {
    userName: string;
    attemptCount: number;
    cardBrand: string;
    cardLast4: string;
    amount: number;
    hostedInvoiceUrl: string;
}

export const PaymentFailed = ({
    userName,
    attemptCount,
    cardBrand,
    cardLast4,
    amount,
    hostedInvoiceUrl,
}: PaymentFailedProps) => {
    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://remindmybill.com";

    const getBadgeStyle = () => {
        if (attemptCount === 1) return { bg: "#fef9c3", text: "#854d0e", label: "Attempt 1 of 3" };
        if (attemptCount === 2) return { bg: "#ffedd5", text: "#9a3412", label: "Attempt 2 of 3" };
        return { bg: "#fee2e2", text: "#991b1b", label: "Final Attempt" };
    };

    const badge = getBadgeStyle();

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
                            style={styles.logo}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={styles.content}>
                        <Text style={styles.heading}>
                            Payment Failed
                        </Text>

                        <Text style={styles.paragraph}>
                            Hi {userName},
                        </Text>

                        <Text style={styles.paragraph}>
                            We were unable to charge your <strong>{cardBrand}</strong> ending in <strong>{cardLast4}</strong> for <strong>€{amount.toFixed(2)}</strong> for your RemindMyBill Pro subscription.
                        </Text>

                        {/* Attempt Badge */}
                        <Section style={{ textAlign: "center", margin: "24px 0" }}>
                            <span style={{
                                backgroundColor: badge.bg,
                                color: badge.text,
                                padding: "8px 16px",
                                borderRadius: "20px",
                                fontWeight: "bold",
                                fontSize: "14px",
                                display: "inline-block"
                            }}>
                                {badge.label}
                            </span>
                        </Section>

                        <Text style={styles.paragraph}>
                            {attemptCount >= 3
                                ? "This is our final attempt to process your payment. To avoid losing access to your Pro features and having your subscriptions locked, please update your payment method immediately."
                                : "No worries! This happens sometimes. Please ensure your card has sufficient funds or update your payment method below to keep your Pro features active."}
                        </Text>

                        <Section style={{ textAlign: "center", marginTop: "32px", marginBottom: "32px" }}>
                            <Button
                                href={hostedInvoiceUrl}
                                style={styles.button}
                            >
                                Update Payment Method
                            </Button>
                        </Section>

                        <Text style={styles.paragraph}>
                            If you have questions, contact us at{" "}
                            <Link href="mailto:support@remindmybill.com" style={styles.link}>
                                support@remindmybill.com
                            </Link>
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Hr style={styles.hr} />
                    <Section style={styles.footer}>
                        <Text style={styles.footerLinks}>
                            <Link href={`${baseUrl}/privacy`} style={styles.footerLink}>Privacy Policy</Link>
                            {" | "}
                            <Link href={`${baseUrl}/terms`} style={styles.footerLink}>Terms & Conditions</Link>
                            {" | "}
                            <Link href={`${baseUrl}/contact`} style={styles.footerLink}>Contact Us</Link>
                        </Text>
                        <Text style={styles.footerSecured}>
                            Secured by Stripe
                        </Text>
                        <Text style={styles.footerNote}>
                            RemindMyBill — Never lose money on forgotten subscriptions
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

const styles = {
    body: {
        backgroundColor: "#0a0a0a",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        margin: 0,
        padding: 0,
    },
    container: {
        margin: "0 auto",
        padding: "40px 20px",
        maxWidth: "600px",
    },
    header: {
        textAlign: "center" as const,
        marginBottom: "32px",
    },
    logo: {
        margin: "0 auto",
    },
    content: {
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "12px",
        padding: "40px",
        color: "#ffffff",
    },
    heading: {
        fontSize: "24px",
        fontWeight: "bold",
        marginBottom: "24px",
        textAlign: "center" as const,
    },
    paragraph: {
        fontSize: "16px",
        lineHeight: "26px",
        color: "#e5e5e5",
        marginBottom: "16px",
    },
    button: {
        backgroundColor: "#3b82f6",
        borderRadius: "8px",
        color: "#fff",
        fontSize: "16px",
        fontWeight: "bold",
        textDecoration: "none",
        textAlign: "center" as const,
        display: "block",
        padding: "16px 32px",
    },
    link: {
        color: "#3b82f6",
        textDecoration: "underline",
    },
    hr: {
        borderColor: "#333",
        margin: "32px 0",
    },
    footer: {
        textAlign: "center" as const,
    },
    footerLinks: {
        color: "#666",
        fontSize: "12px",
        marginBottom: "8px",
    },
    footerLink: {
        color: "#3b82f6",
        textDecoration: "none",
    },
    footerSecured: {
        color: "#888",
        fontSize: "12px",
        fontWeight: "bold",
        textTransform: "uppercase" as const,
        letterSpacing: "1px",
        marginBottom: "8px",
    },
    footerNote: {
        color: "#666",
        fontSize: "12px",
    },
};
