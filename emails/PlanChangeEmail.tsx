import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
    Link,
    Tailwind,
    Button,
} from '@react-email/components';
import * as React from 'react';

interface PlanChangeEmailProps {
    customerName?: string;
    newPlanName: string;
    price: string;
    limit: number;
    type: 'upgrade' | 'downgrade';
    date: string;
}

export const PlanChangeEmail = ({
    customerName = 'valued customer',
    newPlanName,
    price,
    limit,
    type,
    date,
}: PlanChangeEmailProps) => {
    const baseUrl = 'https://remindmybill.com'; // In a real app, this might be dynamic too, but usually static for emails
    const isUpgrade = type === 'upgrade';

    const previewText = isUpgrade
        ? `You are now on the ${newPlanName}!`
        : `Your RemindMyBill Plan has been updated to ${newPlanName}.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-zinc-50 font-sans">
                    <Container className="mx-auto my-10 max-w-[580px] rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                        <Section>
                            <Heading className="text-2xl font-bold tracking-tight text-zinc-900">
                                {isUpgrade ? "Welcome to Pro! 🚀" : "Plan Changed to Free"}
                            </Heading>
                            <Text className="mt-4 text-zinc-600">
                                Hi {customerName},
                            </Text>
                            <Text className="text-zinc-600">
                                {isUpgrade
                                    ? `Thanks for upgrading to the ${newPlanName}! You can now track unlimited subscriptions and access all premium features. Your upgrade date is ${date}.`
                                    : `You have been downgraded to the ${newPlanName} plan. Please note your limit is now ${limit} subscriptions. Excess subscriptions will be locked.`}
                            </Text>
                            <Text className="text-zinc-600 font-bold">
                                New Price: {price}/month
                            </Text>
                        </Section>

                        {isUpgrade && (
                            <Section className="my-6 rounded-xl bg-indigo-50/50 p-6 border border-indigo-100">
                                <Text className="m-0 text-sm font-bold text-indigo-900 mb-4">What's unlocked in your new plan:</Text>
                                <ul className="m-0 p-0 list-none space-y-2">
                                    <li className="text-sm text-indigo-800 flex items-center gap-2">✅ Unlimited Notifications</li>
                                    <li className="text-sm text-indigo-800 flex items-center gap-2">✅ Priority Support</li>
                                    <li className="text-sm text-indigo-800 flex items-center gap-2">✅ Advanced Analytics</li>
                                    <li className="text-sm text-indigo-800 flex items-center gap-2">✅ AI Inbox Hunter</li>
                                </ul>
                            </Section>
                        )}

                        <Section className="mt-8 text-center">
                            <Button
                                href={`${baseUrl}/dashboard`}
                                className="inline-block rounded-xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white no-underline shadow-lg"
                            >
                                Go to Dashboard
                            </Button>
                        </Section>

                        <Hr className="my-8 border-zinc-200" />

                        <Section>
                            <Text className="text-xs text-zinc-400 text-center">
                                Thank you for being a part of Remind My Bill.
                            </Text>
                            <Text className="text-xs text-zinc-400 text-center">
                                Secure Subscription Management &bull; {new Date().getFullYear()}
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default PlanChangeEmail;
