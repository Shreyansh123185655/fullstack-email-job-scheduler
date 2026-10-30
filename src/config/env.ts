export const env = {
  useMock: import.meta.env.VITE_USE_MOCK !== "false",
  apiUrl: (import.meta.env.VITE_API_URL as string) ?? "/api",
};
