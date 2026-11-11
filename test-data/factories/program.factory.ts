import { faker } from '@faker-js/faker';

export type ProgramCreateInput = {
  name: string;
  description: string;
};

/** Unique happy-path program payload for UI or API creates. */
export function buildProgramCreateInput(
  overrides: Partial<ProgramCreateInput> = {},
): ProgramCreateInput {
  const suffix = faker.string.alphanumeric(8);
  return {
    name: overrides.name ?? `${faker.company.buzzPhrase()} ${suffix}`,
    description: overrides.description ?? faker.lorem.paragraph(),
  };
}
