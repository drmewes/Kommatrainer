import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { getChatGPTUser } from "./chatgpt-auth";
import { verifyAccessJwt } from "./lib/access-jwt.mjs";

export type AppUser = { userId: string; email: string };

// Deployed sites sit behind Cloudflare Access; local previews keep the loopback-only test login.
export async function getUser(): Promise<AppUser | null> {
  if (import.meta.env.DEV) {
    const user = await getChatGPTUser();
    return user && { userId: user.userId, email: user.email };
  }
  const token = (await headers()).get("cf-access-jwt-assertion");
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const claims = token ? await verifyAccessJwt(token, { teamDomain, audience: env.ACCESS_AUD }) : null;
  return claims && { userId: "access:" + claims.email.toLowerCase(), email: claims.email };
}
