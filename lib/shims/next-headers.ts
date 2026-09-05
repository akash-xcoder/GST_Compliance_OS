export async function cookies() {
  return {
    getAll: () => [],
    get: (_name: string) => undefined,
    set: (_name: string, _value: string, _options?: any) => {},
    delete: (_name: string) => {},
    has: (_name: string) => false,
  };
}

export async function headers() {
  return new Headers();
}
