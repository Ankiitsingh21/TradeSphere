import { http } from "@/lib/api/http";
import { mapUser } from "@/lib/api/mappers";
import type { AuthPayload, User } from "@/lib/types";
import { isRecord } from "@/lib/utils";

export async function fetchCurrentUser(): Promise<User | null> {
  const response = await http.get("/api/users/current-user");
  const payload = response.data;

  if (isRecord(payload) && "currentUser" in payload) {
    return mapUser(payload.currentUser);
  }

  return null;
}

export async function signIn(payload: AuthPayload): Promise<void> {
  await http.post("/api/users/sign-in", payload);
}

export async function signUp(payload: AuthPayload): Promise<void> {
  await http.post("/api/users/sign-up", payload);
}

export async function signOut(): Promise<void> {
  await http.post("/api/users/sign-out");
}
