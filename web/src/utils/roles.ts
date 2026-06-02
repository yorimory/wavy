import type { UserOut, UserRole } from "@/types";

export function isPrivatePerson(user: UserOut | null | undefined): boolean {
  return user?.role === "private_person";
}

export function isClient(user: UserOut | null | undefined): boolean {
  return user?.role === "client";
}

export function homePathForRole(role: UserRole): string {
  return role === "client" ? "/home" : "/";
}

export const ROLE_LABELS: Record<UserRole, string> = {
  private_person: "Частное лицо",
  client: "Клиент",
};
