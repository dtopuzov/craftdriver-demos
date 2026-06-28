export type RegistrationStudent = {
  displayName: string;
  email: string;
  password: string;
};

export function uniqueName(prefix: string) {
  return `${prefix} ${new Date().toISOString().replace(/[-:.TZ]/g, '')} ${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function makeRegistrationStudent(): RegistrationStudent {
  const suffix = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  return {
    displayName: `E2E Student ${suffix}`,
    email: `e2e.student.${suffix}@example.test`,
    password: 'learning-2026',
  };
}
