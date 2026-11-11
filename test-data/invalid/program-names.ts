/** Curated invalid program names for validation specs — fixed sets, not Faker. */
export const WHITESPACE_ONLY_PROGRAM_NAMES = ['', '   '] as const;

export const SINGLE_CHAR_PROGRAM_NAME = 'A' as const;

export const DUPLICATE_NAME_VARIANTS = {
  padded: (canonical: string) => `  ${canonical}  `,
  extraSpacesBetweenWords: 'Web  Development  2026',
} as const;
