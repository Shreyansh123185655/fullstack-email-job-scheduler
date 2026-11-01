export const env = {
  useMock: import.meta.env.VITE_USE_MOCK === "true",
  apiUrl: (import.meta.env.VITE_API_URL as string) || (typeof window !== "undefined" && window.location.hostname.includes("vercel.app") ? "https://reachinbox-backend-3g1j.onrender.com/api" : "/api"),
};
