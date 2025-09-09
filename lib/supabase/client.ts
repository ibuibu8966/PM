import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            if (typeof document !== 'undefined') {
              const cookie = document.cookie
                .split('; ')
                .find(row => row.startsWith(`${name}=`));
              return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined;
            }
            return undefined;
          },
          set(name: string, value: string, options?: any) {
            if (typeof document !== 'undefined') {
              document.cookie = `${name}=${encodeURIComponent(value)}; path=/; ${
                options?.maxAge ? `max-age=${options.maxAge};` : ''
              }`;
            }
          },
          remove(name: string) {
            if (typeof document !== 'undefined') {
              document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            }
          },
        },
      }
    );
  }
  return client;
}
