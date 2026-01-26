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

interface BillReminderEmailProps {
    customerName?: string;
    serviceName: string;
    amount: number;
    currency: string;
    dueDate: string;
    cancellationAdvice?: string;
}

export const BillReminderEmail = ({
    customerName = 'valued customer',
    serviceName,
    amount,
    currency,
    dueDate,
    cancellationAdvice = 'To cancel, visit the merchant\'s website at least 24 hours in advance.',
}: BillReminderEmailProps) => {
    const baseUrl = 'https://remindmybill.com';
    const previewText = `${serviceName} is renewing in 3 days.`;
    const googleCancelUrl = `https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(serviceName)}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-zinc-50 font-sans">
                    <Container className="mx-auto my-10 max-w-[580px] rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                        <Section>
                            <Heading className="text-2xl font-bold tracking-tight text-zinc-900">
                                {serviceName} is renewing in 3 days.
                            </Heading>
                            <Text className="mt-4 text-zinc-600">
                                Hi {customerName},
                            </Text>
                            <Text className="text-zinc-600">
                                This is a reminder that your subscription for <strong>{serviceName}</strong> is scheduled to renew shortly.
                            </Text>
                        </Section>

                        <Section className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 my-6">
                            <Text className="m-0 text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                💡 Smart Tip
                            </Text>
                            <Text className="m-0 text-sm text-indigo-800 leading-relaxed">
                                {cancellationAdvice}
                            </Text>
                        </Section>

                        <Section className="my-8 rounded-xl bg-zinc-50 p-6 border border-zinc-200">
                            <Text className="m-0 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Payment Details</Text>
                            <div className="flex justify-between items-center mb-2">
                                <Text className="m-0 text-sm text-zinc-600">Amount:</Text>
                                <Text className="m-0 text-lg font-bold text-zinc-900">{currency} {amount.toFixed(2)}</Text>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <Text className="m-0 text-sm text-zinc-600">Due Date:</Text>
                                <Text className="m-0 text-sm font-bold text-zinc-900">{dueDate}</Text>
                            </div>
                            <Hr className="border-zinc-200 my-4" />
                            <Text className="m-0 text-[11px] text-zinc-400 italic">
                                Note: These charges are usually processed in the morning of the due date.
                            </Text>
                        </Section>

                        <Section className="my-8">
                            <Heading className="text-lg font-bold text-zinc-900 mb-2">Want to cancel?</Heading>
                            <Text className="text-zinc-600 text-sm mb-4">
                                If you no longer need this service, we've prepared a quick link to help you find the cancellation steps:
                            </Text>
                            <Button
                                href={googleCancelUrl}
                                className="bg-white border border-rose-200 text-rose-600 px-6 py-3 rounded-xl text-sm font-bold shadow-sm"
                            >
                                How to cancel {serviceName}
                            </Button>
                        </Section>

                        <Section className="bg-amber-50 rounded-xl p-4 border border-amber-100 my-8">
                            <Text className="m-0 text-xs text-amber-800 leading-relaxed">
                                ⚠️ <strong>Note:</strong> This is an automated reminder. Cancellation usually takes up to 24 hours to process before the billing date.
                            </Text>
                        </Section>

                        <Section className="text-center">
                            <Link
                                href={`${baseUrl}/dashboard`}
                                className="text-zinc-400 text-sm font-medium underline"
                            >
                                Manage all subscriptions on your Dashboard
                            </Link>
                        </Section>

                        <Hr className="my-8 border-zinc-200" />

                        <Section>
                            <Text className="text-xs text-zinc-400 text-center">
                                Remind My Bill &bull; Secure Subscription Management &bull; {new Date().getFullYear()}
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default BillReminderEmail;
