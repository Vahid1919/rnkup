/**
 * How a player lookup can fail, and the HTTP status each failure maps to.
 */

export type PlayerLookupErrorKind =
  | 'invalid-input'
  | 'not-found'
  | 'rate-limited'
  | 'upstream';

export class PlayerLookupError extends Error {
  constructor(
    public readonly kind: PlayerLookupErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/** The HTTP status a route should answer with for a lookup failure. */
export function lookupErrorStatus(kind: PlayerLookupErrorKind): number {
  switch (kind) {
    case 'invalid-input':
      return 400;
    case 'not-found':
      return 404;
    case 'rate-limited':
      return 429;
    case 'upstream':
      return 502;
  }
}
