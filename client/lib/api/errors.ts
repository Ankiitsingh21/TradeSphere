import axios from "axios";
import { isRecord, toStringOrEmpty } from "@/lib/utils";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Request failed. Please try again.",
): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const payload = error.response?.data;
  if (isRecord(payload)) {
    if (
      typeof payload.message === "string" &&
      payload.message.trim().length > 0
    ) {
      return payload.message;
    }

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      const firstError = payload.errors[0];
      if (isRecord(firstError)) {
        const message = toStringOrEmpty(firstError.message);
        if (message) {
          return message;
        }
      }
    }
  }

  return error.message || fallback;
}
