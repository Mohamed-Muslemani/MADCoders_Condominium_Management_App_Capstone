type QueryValue = string | number | boolean | null | undefined;

export function buildQueryParams(params: object): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params) as Array<
    [string, QueryValue]
  >) {
    if (value === undefined || value === null) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams;
}