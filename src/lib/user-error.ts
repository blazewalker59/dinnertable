/**
 * An error whose message is written for the person (or agent) who caused
 * it, and is safe to show. Anything else is reported, and only a generic
 * message goes back.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserError'
  }
}

export const GENERIC_MESSAGE = 'Something went wrong. Try again.'
