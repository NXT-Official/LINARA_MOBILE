/** The part of a Supabase session Sentry may see. */
export interface SessionLike {
  user: { id: string };
}

/**
 * Who Sentry tags events with: the account's opaque id, built fresh so no
 * other field of the user (email, phone, metadata) can ride along. Null when
 * signed out.
 */
export function sentryUserFor(session: SessionLike | null): { id: string } | null {
  return session ? { id: session.user.id } : null;
}
