import EmailLayout from "./EmailLayout";
import { Text, Button, Section } from "@react-email/components";

interface DowngradeConfirmationProps {
    name: string;
    previousTier: string;
}

export default function DowngradeConfirmation({
    name,
    previousTier,
}: DowngradeConfirmationProps) {
    return (
        <EmailLayout previewText="You're now on the Free plan">
            <Text style={heading}>Your Plan Has Changed</Text>

            <Text style={paragraph}>Hi {name},</Text>

            <Text style={paragraph}>
                Your <strong>{previousTier}</strong> subscription has ended, and your
                account has been switched to the <strong>Free plan</strong>.
            </Text>

            <Section style={freePlanBox}>
                <Text style={boxTitle}>Your Free Plan Includes:</Text>
                <ul style={featureList}>
                    <li>Track up to 7 subscriptions</li>
                    <li>3 email alerts per month</li>
                    <li>Health Score tracking</li>
                    <li>Trust Center access</li>
                </ul>
            </Section>

            <Text style={paragraph}>
                We're sorry to see you go! If you'd like to regain access to unlimited
                tracking, advanced analytics, and all premium features, you can upgrade
                anytime.
            </Text>

            <Button href={`${process.env.NEXT_PUBLIC_URL}/pricing`} style={button}>
                Explore Plans & Pricing
            </Button>

            <Text style={paragraph}>
                Thank you for being part of the RemindMyBill community. We're here if
                you need us!
            </Text>
        </EmailLayout>
    );
}

const heading = {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: "24px",
};

const paragraph = {
    color: "#e5e5e5",
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "16px",
};

const freePlanBox = {
    backgroundColor: "#1a3a1a",
    border: "1px solid #10b981",
    borderRadius: "8px",
    padding: "20px",
    margin: "24px 0",
};

const boxTitle = {
    color: "#10b981",
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "12px",
};

const featureList = {
    color: "#e5e5e5",
    fontSize: "14px",
    lineHeight: "24px",
    paddingLeft: "20px",
    margin: "0",
};

const button = {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "8px",
    textDecoration: "none",
    display: "inline-block",
    fontWeight: "600",
    margin: "16px 0",
};
