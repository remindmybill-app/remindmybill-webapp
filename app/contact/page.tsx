import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ContactForm from '@/components/ContactForm';

export const metadata = {
    title: 'Contact Us | RemindMyBill',
    description: 'Get in touch with our support team'
};

export default async function ContactPage() {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?redirect=/contact');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return (
        <div className="min-h-screen bg-black py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-3">
                        Contact Us
                    </h1>
                    <p className="text-gray-400">
                        Have a question or feedback? We're here to help.
                    </p>
                </div>

                <ContactForm
                    userEmail={user.email!}
                    userName={profile?.full_name || ''}
                    userTier={profile?.user_tier || 'free'}
                />
            </div>
        </div>
    );
}
