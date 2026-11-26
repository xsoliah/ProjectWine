import { HttpErrorResponse } from '@angular/common/http';

const IDENTITY_MESSAGES: Record<string, string> = {
  DuplicateUserName: 'Diese E-Mail-Adresse ist bereits registriert.',
  DuplicateEmail: 'Diese E-Mail-Adresse ist bereits registriert.',
  InvalidEmail: 'Bitte gib eine gültige E-Mail-Adresse ein.',
  InvalidUserName: 'Bitte gib eine gültige E-Mail-Adresse ein.',
  PasswordTooShort: 'Das Passwort ist zu kurz.',
  PasswordRequiresNonAlphanumeric: 'Das Passwort braucht mindestens ein Sonderzeichen.',
  PasswordRequiresDigit: 'Das Passwort braucht mindestens eine Ziffer.',
  PasswordRequiresLower: 'Das Passwort braucht mindestens einen Kleinbuchstaben.',
  PasswordRequiresUpper: 'Das Passwort braucht mindestens einen Großbuchstaben.',
  PasswordRequiresUniqueChars: 'Das Passwort braucht mehr verschiedene Zeichen.',
};

interface ProblemDetails {
  detail?: string;
  errors?: Record<string, string[] | string>;
}

/** Turns any thrown value into a German, user-facing message. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Etwas ist schiefgelaufen. Bitte versuche es erneut.';
  }
  if (error.status === 0) {
    return 'Der Server ist nicht erreichbar. Prüfe deine Verbindung und die Server-Adresse.';
  }
  const problem = (error.error ?? {}) as ProblemDetails;
  if (problem.errors) {
    const messages = Object.entries(problem.errors).flatMap(([code, texts]) =>
      IDENTITY_MESSAGES[code] ? [IDENTITY_MESSAGES[code]] : [texts].flat(),
    );
    const unique = [...new Set(messages)];
    if (unique.length > 0) {
      return unique.join(' ');
    }
  }
  if (problem.detail) {
    return problem.detail;
  }
  return error.status >= 500
    ? 'Der Server hat einen Fehler gemeldet. Bitte versuche es später erneut.'
    : 'Die Anfrage konnte nicht verarbeitet werden.';
}
