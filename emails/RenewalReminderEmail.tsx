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
} from '@react-email/components';
import * as React from 'react';

interface RenewalReminderEmailProps {
    customerName?: string;
    serviceName: string;
    amount: number;
    currency: string;
    dueDate: string;
}

export const RenewalReminderEmail = ({
    customerName = 'valued customer',
    serviceName,
    amount,
    currency,
    dueDate,
}: RenewalReminderEmailProps) => {
    const previewText = `Reminder: Your ${serviceName} subscription is due soon.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-zinc-50 font-sans">
                    <Container className="mx-auto my-10 max-w-[580px] rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                        <Section>
                            <Heading className="text-2xl font-bold tracking-tight text-zinc-900">
                                Payment Reminder
                            </Heading>
                            <Text className="mt-4 text-zinc-600">
                                Hi {customerName},
                            </Text>
                            <Text className="text-zinc-600">
                                This is a friendly reminder that your subscription for <strong>{serviceName}</strong> is coming up for renewal.
                            </Text>
                        </Section>

                        <Section className="my-8 rounded-xl bg-zinc-50 p-6 ring-1 ring-zinc-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <Text className="m-0 text-xs font-bold uppercase tracking-widest text-zinc-400">Amount Due</Text>
                                    <Text className="m-0 text-xl font-bold text-zinc-900">
                                        {currency} {amount.toFixed(2)}
                                    </Text>
                                </div>
                                <div className="text-right">
                                    <Text className="m-0 text-xs font-bold uppercase tracking-widest text-zinc-400">Due Date</Text>
                                    <Text className="m-0 text-sm font-bold text-zinc-900">{dueDate}</Text>
                                </div>
                            </div>
                        </Section>

                        <Section>
                            <Text className="text-zinc-600">
                                You can view and manage your subscriptions anytime on your dashboard.
                            </Text>
                            <Section className="mt-8 text-center">
                                <Link
                                    href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
                                    className="inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white no-underline shadow-lg shadow-indigo-500/20"
                                >
                                    Go to Dashboard
                                </Link>
                            </Section>
                        </Section>

                        <Hr className="my-8 border-zinc-200" />

                        <Section>
                            <Text className="text-xs text-zinc-400 text-center">
                                Remind My Bill &bull; Secure Subscription Management
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default RenewalReminderEmail;
