import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: string;
  email?: string;
  planId?: string;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "quant-edge-dev-secret-change-me-32chars",
  cookieName: "quant_edge_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}
