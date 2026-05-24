import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient(editToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  if (editToken) {
    return createBrowserClient(url, publishableKey, {
      global: {
        headers: {
          "x-survey-edit-token": editToken,
        },
      },
    });
  }

  if (!client) {
    client = createBrowserClient(url, publishableKey);
  }

  return client;
}
