import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Img,
    Text,
    Hr,
    Link,
} from "@react-email/components";

interface EmailLayoutProps {
    children: React.ReactNode;
    previewText: string;
}

export default function EmailLayout({ children, previewText }: EmailLayoutProps) {
    return (
        <Html>
            <Head />
            <Body style={body}>
                <Container style={container}>
                    {/* Logo Header */}
                    <Section style={header}>
                        <Img
                            src={`${process.env.NEXT_PUBLIC_URL}/rmmb-logo.png`}
                            alt="RemindMyBill"
                            width="150"
                            height="40"
                            style={logo}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={content}>{children}</Section>

                    {/* Footer */}
                    <Hr style={hr} />
                    <Section style={footer}>
                        <Text style={footerText}>
                            Thank you,
                            <br />
                            <strong>The Customer Experience Team at RemindMyBill</strong>
                        </Text>

                        <Text style={footerLinks}>
                            <Link href="https://remindmybill.com/privacy" style={link}>
                                Privacy Policy
                            </Link>
                            {" • "}
                            <Link href="https://remindmybill.com/terms" style={link}>
                                Terms & Conditions
                            </Link>
                            {" • "}
                            <Link href="https://remindmybill.com/contact" style={link}>
                                Contact Us
                            </Link>
                        </Text>

                        <Text style={footerNote}>
                            RemindMyBill • Never lose money on forgotten subscriptions
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const body = {
    backgroundColor: "#0a0a0a",
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
    margin: "0 auto",
    padding: "40px 20px",
    maxWidth: "600px",
};

const header = {
    textAlign: "center" as const,
    marginBottom: "32px",
};

const logo = {
    margin: "0 auto",
};

const content = {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "32px",
    color: "#ffffff",
};

const hr = {
    borderColor: "#333",
    margin: "32px 0",
};

const footer = {
    textAlign: "center" as const,
};

const footerText = {
    color: "#999",
    fontSize: "14px",
    lineHeight: "22px",
};

const footerLinks = {
    color: "#666",
    fontSize: "12px",
    marginTop: "16px",
};

const link = {
    color: "#3b82f6",
    textDecoration: "none",
};

const footerNote = {
    color: "#666",
    fontSize: "12px",
    marginTop: "16px",
};
