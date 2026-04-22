import axios from "axios";
import { env } from "@/lib/env";

function resolveApiBaseUrl() {
  const configured = env.apiBaseUrl;
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://sphere.dev";
}

export const http = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.startsWith("/auth/");
      if (!isAuthPage) {
        const next = encodeURIComponent(
          `${currentPath}${window.location.search}`,
        );
        window.location.replace(`/auth/sign-in?next=${next}`);
      }
    }

    return Promise.reject(error);
  },
);
