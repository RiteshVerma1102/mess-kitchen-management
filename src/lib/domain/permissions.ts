/** Role × area permission matrix (mirrors the RLS policies; UI hiding is never the only guard). */
export const ROLES = ["admin", "manager", "kitchen", "attendance", "student", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const AREAS = [
  "settings",
  "users",
  "menu",
  "inventory",
  "purchasing",
  "kitchen",
  "attendance",
  "students",
  "analytics",
] as const;
export type Area = (typeof AREAS)[number];

/** none | read | write | own (only own rows) | published (only published rows) */
export type Access = "none" | "read" | "write" | "own" | "published";

export const MATRIX: Record<Area, Record<Role, Access>> = {
  settings: { admin: "write", manager: "read", kitchen: "none", attendance: "none", student: "none", viewer: "none" },
  users: { admin: "write", manager: "read", kitchen: "none", attendance: "none", student: "none", viewer: "none" },
  menu: { admin: "write", manager: "write", kitchen: "read", attendance: "read", student: "published", viewer: "read" },
  inventory: { admin: "write", manager: "write", kitchen: "write", attendance: "none", student: "none", viewer: "read" },
  purchasing: { admin: "write", manager: "write", kitchen: "read", attendance: "none", student: "none", viewer: "read" },
  kitchen: { admin: "write", manager: "write", kitchen: "write", attendance: "none", student: "none", viewer: "read" },
  attendance: { admin: "write", manager: "write", kitchen: "read", attendance: "write", student: "own", viewer: "read" },
  students: { admin: "write", manager: "write", kitchen: "none", attendance: "read", student: "own", viewer: "read" },
  analytics: { admin: "write", manager: "write", kitchen: "read", attendance: "none", student: "none", viewer: "read" },
};

/** Highest access across a user's roles. */
export function accessFor(roles: readonly Role[], area: Area): Access {
  const rank: Record<Access, number> = { none: 0, own: 1, published: 1, read: 2, write: 3 };
  return roles.reduce<Access>((best, r) => (rank[MATRIX[area][r]] > rank[best] ? MATRIX[area][r] : best), "none");
}

export const canRead = (roles: readonly Role[], area: Area) => accessFor(roles, area) !== "none";
export const canWrite = (roles: readonly Role[], area: Area) => accessFor(roles, area) === "write";
