import EmailLayout from "./EmailLayout";
import { Text, Button } from "@react-email/components";

interface ReactivationEmailProps {
    name: string;
    tier: string;
}

export default function ReactivationEmail({ name, tier }: ReactivationEmailProps) {
    return (
        <EmailLayout previewText="Welcome back! Your subscription is active">
            <Text style={heading}>🎉 Welcome Back!</Text>

            <Text style={paragraph}>Hi {name},</Text>

            <Text style={paragraph}>
                Great news! Your <strong>{tier}</strong> subscription has been reactivated.
                We're thrilled to have you back protecting your wallet with us.
            </Text>

            <Text style={paragraph}>Your account now has full access to:</Text>

            <ul style={featureList}>
                <li>Unlimited subscription tracking</li>
                <li>Unlimited email & push notifications</li>
                <li>Advanced analytics & spending trends</li>
                <li>Export reports</li>
                <li>Trust Center contributions</li>
                <li>Priority support</li>
            </ul>

            <Button
                href={`${process.env.NEXT_PUBLIC_URL}/dashboard`}
                style={button}
            >
                Go to Dashboard
            </Button>

            <Text style={paragraph}>
                Thank you for continuing to trust RemindMyBill!
            </Text>
        </EmailLayout>
    );
}

// Styles
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
