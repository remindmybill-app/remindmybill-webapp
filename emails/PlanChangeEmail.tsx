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

interface PlanChangeEmailProps {
    customerName?: string;
    newPlanName: string;
    price: string;
}

export const PlanChangeEmail = ({
    customerName = 'valued customer',
    newPlanName,
    price,
}: PlanChangeEmailProps) => {
    const previewText = `Your RemindMyBill Plan has been updated to ${newPlanName}.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-zinc-50 font-sans">
                    <Container className="mx-auto my-10 max-w-[580px] rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                        <Section>
                            <Heading className="text-2xl font-bold tracking-tight text-zinc-900">
                                Your RemindMyBill Plan has been updated
                            </Heading>
                            <Text className="mt-4 text-zinc-600">
                                Hi {customerName},
                            </Text>
                            <Text className="text-zinc-600">
                                You have successfully switched to the <strong>{newPlanName}</strong> plan.
                            </Text>
                            <Text className="text-zinc-600">
                                <strong>New Price:</strong> {price}/month
                            </Text>
                        </Section>

                        <Section className="mt-8 text-center">
                            <Link
                                href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
                                className="inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white no-underline shadow-lg shadow-indigo-500/20"
                            >
                                Go to Dashboard
                            </Link>
                        </Section>

                        <Hr className="my-8 border-zinc-200" />

                        <Section>
                            <Text className="text-xs text-zinc-400 text-center">
                                Thank you for being a part of Remind My Bill.
                            </Text>
                            <Text className="text-xs text-zinc-400 text-center">
                                Secure Subscription Management &bull; 2026
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default PlanChangeEmail;
