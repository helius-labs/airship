// app/providers.tsx
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

if (typeof window !== 'undefined') {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
        api_host: 'https://dashboard.helius.dev/ingest',
        ui_host: 'https://us.posthog.com',
        person_profiles: 'identified_only',
        autocapture: false,
    });
}

export function PHProvider({ children }: { children: React.ReactNode }) {
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}