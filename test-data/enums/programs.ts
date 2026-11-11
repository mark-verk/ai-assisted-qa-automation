/** Repeated API and navigation paths — import instead of string literals in specs. */
export const ProgramsApiPath = {
  collection: '/api/programs',
  byId: (id: string) => `/api/programs/${id}`,
} as const;

export const ProgramsUiPath = {
  list: '/programs',
} as const;
