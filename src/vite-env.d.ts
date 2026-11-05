/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}


interface ImportMetaEnv {
  readonly VITE_NEON_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_LEGAL_NAME?: string;
  readonly VITE_LEGAL_ADDRESS?: string;
  readonly VITE_LEGAL_REGISTRATION_ID?: string;
  readonly VITE_CONTACT_EMAIL?: string;
}
