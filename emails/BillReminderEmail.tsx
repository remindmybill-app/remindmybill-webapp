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
    category?: string;
    isTrial?: boolean;
    cancellationLink?: string;
}

export const BillReminderEmail = ({
    customerName = 'valued customer',
    serviceName,
    amount,
    currency,
    dueDate,
    category = 'Subscription',
    isTrial = false,
    cancellationLink,
}: BillReminderEmailProps) => {
    const baseUrl = 'https://remindmybill.com';
    const previewText = `Heads up! ${serviceName} renews in 3 days.`;
    const googleCancelUrl = `https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(serviceName)}`;
    const actionUrl = cancellationLink || googleCancelUrl;
    const actionText = cancellationLink ? 'Manage Subscription' : `How to cancel ${serviceName}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-zinc-50 font-sans">
                    <Container className="mx-auto my-10 max-w-[580px] rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">

                        {/* Header */}
                        <Section>
                            <Heading className="text-2xl font-bold tracking-tight text-zinc-900">
                                Heads up! {serviceName} renews in 3 days.
                            </Heading>
                            <Text className="mt-4 text-zinc-600">
                                Hi {customerName},
                            </Text>
                        </Section>

                        {/* Smart Alerts: Trial Warning */}
                        {isTrial && (
                            <Section className="bg-rose-50 rounded-xl p-4 border border-rose-100 my-6">
                                <Text className="m-0 text-sm font-bold text-rose-700 flex items-center gap-2">
                                    ⚠️ YOUR FREE TRIAL IS ENDING
                                </Text>
                                <Text className="m-0 text-sm text-rose-600 mt-1">
                                    Cancel now to avoid being charged {currency} {amount.toFixed(2)}.
                                </Text>
                            </Section>
                        )}

                        {/* Details Box */}
                        <Section className="my-6 rounded-xl bg-zinc-50 p-6 border border-zinc-200">
                            <Text className="m-0 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">
                                Upcoming Charge
                            </Text>
                            <div className="flex justify-between items-center mb-2">
                                <Text className="m-0 text-sm text-zinc-600">Service:</Text>
                                <Text className="m-0 text-base font-medium text-zinc-900">{serviceName}</Text>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <Text className="m-0 text-sm text-zinc-600">Cost:</Text>
                                <Text className="m-0 text-lg font-bold text-zinc-900">{currency} {amount.toFixed(2)}</Text>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <Text className="m-0 text-sm text-zinc-600">Date:</Text>
                                <Text className="m-0 text-sm font-bold text-zinc-900">{dueDate}</Text>
                            </div>
                            <div className="flex justify-between items-center text-zinc-500">
                                <Text className="m-0 text-sm">Category:</Text>
                                <Text className="m-0 text-sm font-medium">{category}</Text>
                            </div>

                            <Hr className="border-zinc-200 my-4" />
                            <Text className="m-0 text-[11px] text-zinc-400 italic">
                                Note: These charges are usually processed in the morning of the due date.
                            </Text>
                        </Section>

                        {/* Action Section */}
                        <Section className="my-8 text-center">
                            <Button
                                href={actionUrl}
                                className={`px-6 py-3 rounded-xl text-sm font-bold shadow-sm ${isTrial
                                        ? "bg-rose-600 text-white hover:bg-rose-700"
                                        : "bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50"
                                    }`}
                            >
                                {actionText}
                            </Button>
                        </Section>

                        {/* Footer Link */}
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
                                Sent by RemindMyBill to help you save money.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default BillReminderEmail;
