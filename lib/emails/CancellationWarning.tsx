import EmailLayout from "./EmailLayout";
import { Text, Button, Section } from "@react-email/components";

interface CancellationWarningProps {
    name: string;
    tier: string;
    cancellationDate: Date;
    reactivationToken: string;
}

export default function CancellationWarning({
    name,
    tier,
    cancellationDate,
    reactivationToken,
}: CancellationWarningProps) {
    const formattedDate = new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
    }).format(cancellationDate);

    const daysRemaining = Math.max(
        0,
        Math.ceil(
            (cancellationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
    );

    return (
        <EmailLayout previewText={`Your ${tier} plan will end on ${formattedDate}`}>
            <Text style={heading}>Subscription Cancellation Scheduled</Text>

            <Text style={paragraph}>Hi {name},</Text>

            <Text style={paragraph}>
                We've received your request to cancel your <strong>{tier}</strong>{" "}
                subscription.
            </Text>

            <Section style={infoBox}>
                <Text style={infoTitle}>⏰ Your access will end on:</Text>
                <Text style={infoValue}>{formattedDate}</Text>
                <Text style={infoSubtext}>
                    You have <strong>{daysRemaining} days</strong> remaining of your paid
                    access.
                </Text>
            </Section>

            <Text style={paragraph}>
                After this date, your account will automatically switch to the{" "}
                <strong>Free plan</strong>. You'll still be able to track up to 7
                subscriptions with limited alerts.
            </Text>

            <Text style={paragraph}>
                <strong>Changed your mind?</strong>
            </Text>

            <Button
                href={`${process.env.NEXT_PUBLIC_URL}/api/subscriptions/reactivate?token=${reactivationToken}`}
                style={button}
            >
                Cancel Cancellation & Keep My Plan
            </Button>

            <Text style={smallText}>
                If the button doesn't work, copy this link:
                <br />
                {`${process.env.NEXT_PUBLIC_URL}/api/subscriptions/reactivate?token=${reactivationToken}`}
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

const infoBox = {
    backgroundColor: "#262626",
    border: "1px solid #3b82f6",
    borderRadius: "8px",
    padding: "20px",
    margin: "24px 0",
    textAlign: "center" as const,
};

const infoTitle = {
    color: "#999",
    fontSize: "14px",
    marginBottom: "8px",
};

const infoValue = {
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "8px",
};

const infoSubtext = {
    color: "#999",
    fontSize: "14px",
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

const smallText = {
    color: "#999",
    fontSize: "12px",
    lineHeight: "18px",
    marginTop: "16px",
};
