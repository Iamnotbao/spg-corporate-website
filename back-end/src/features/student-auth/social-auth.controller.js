import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { getCollection } from "../../config/db.js";
import { env } from "../../config/env.js";

const PROVIDERS = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
  },
  facebook: {
    authorizeUrl: "https://www.facebook.com/v23.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v23.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)",
    scope: "email,public_profile",
  },
};

function configFor(provider) {
  return provider === "google" ? env.socialAuth.google : env.socialAuth.facebook;
}

function frontendCallbackUrl() {
  return `${env.appPublicUrl}/oauth/callback`;
}

function backendCallbackUrl(provider) {
  const base = env.apiPublicUrl || `http://localhost:${env.port}`;
  return `${base.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
}

function signState(provider) {
  return jwt.sign({ provider, nonce: crypto.randomBytes(16).toString("hex") }, env.jwtSecret, {
    expiresIn: "10m",
    audience: "mandora-oauth",
    issuer: "mandora",
  });
}

function verifyState(state, provider) {
  const payload = jwt.verify(state, env.jwtSecret, {
    audience: "mandora-oauth",
    issuer: "mandora",
  });
  if (payload.provider !== provider) throw new Error("OAuth provider mismatch");
}

function socialToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      username: user.username,
      ver: Number(user.authVersion) || 0,
    },
    env.jwtSecret,
    { expiresIn: "8h" },
  );
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function safeUsername(email, provider, providerId) {
  const base = String(email || `${provider}.${providerId}`)
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 28) || "student";
  return `${base}.${crypto.createHash("sha1").update(`${provider}:${providerId}`).digest("hex").slice(0, 8)}`;
}

async function exchangeCode(provider, code) {
  const providerConfig = PROVIDERS[provider];
  const credentials = configFor(provider);
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    code,
    redirect_uri: backendCallbackUrl(provider),
    grant_type: "authorization_code",
  });
  const response = await fetch(providerConfig.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`OAuth token exchange failed (${response.status})`);
  return response.json();
}

async function fetchProfile(provider, accessToken) {
  const response = await fetch(PROVIDERS[provider].profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`OAuth profile request failed (${response.status})`);
  const profile = await response.json();
  return {
    id: String(profile.sub || profile.id || ""),
    email: normalizeEmail(profile.email),
    emailVerified: provider === "google" ? profile.email_verified === true : Boolean(profile.email),
    displayName: String(profile.name || profile.email || "Mandora Student").slice(0, 100),
    avatarUrl: String(profile.picture?.data?.url || profile.picture || "").slice(0, 500),
  };
}

async function upsertSocialStudent(provider, profile) {
  if (!profile.id || !profile.email || !profile.emailVerified) {
    throw new Error("Provider did not return a verified email address");
  }
  const users = await getCollection("users");
  const identityPath = `social.${provider}.id`;
  let user = await users.findOne({ [identityPath]: profile.id, role: "student" });
  const now = new Date();
  if (!user) user = await users.findOne({ email: profile.email, role: "student" });
  if (user) {
    if (user.active === false) throw new Error("Student account is disabled");
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          [identityPath]: profile.id,
          [`social.${provider}.email`]: profile.email,
          [`social.${provider}.linkedAt`]: now,
          avatarUrl: user.avatarUrl || profile.avatarUrl,
          emailVerifiedAt: user.emailVerifiedAt || now,
          updatedAt: now,
        },
      },
    );
    return users.findOne({ _id: user._id });
  }
  const document = {
    username: safeUsername(profile.email, provider, profile.id),
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    role: "student",
    permissions: [],
    active: true,
    authVersion: 0,
    emailVerifiedAt: now,
    social: {
      [provider]: { id: profile.id, email: profile.email, linkedAt: now },
    },
    createdAt: now,
    updatedAt: now,
  };
  const result = await users.insertOne(document);
  return { ...document, _id: result.insertedId };
}

export function oauthStatus(_req, res) {
  return res.json({
    data: {
      google: Boolean(env.socialAuth.google.clientId && env.socialAuth.google.clientSecret),
      facebook: Boolean(env.socialAuth.facebook.clientId && env.socialAuth.facebook.clientSecret),
    },
  });
}

export function oauthStart(req, res) {
  const provider = String(req.params.provider || "").toLowerCase();
  const providerConfig = PROVIDERS[provider];
  const credentials = configFor(provider);
  if (!providerConfig) return res.status(404).json({ error: "Unsupported OAuth provider" });
  if (!credentials.clientId || !credentials.clientSecret) {
    return res.status(503).json({ error: `${provider} login is not configured yet` });
  }
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: backendCallbackUrl(provider),
    response_type: "code",
    scope: providerConfig.scope,
    state: signState(provider),
  });
  if (provider === "google") params.set("prompt", "select_account");
  return res.redirect(`${providerConfig.authorizeUrl}?${params.toString()}`);
}

export async function oauthCallback(req, res) {
  const provider = String(req.params.provider || "").toLowerCase();
  try {
    if (!PROVIDERS[provider]) throw new Error("Unsupported OAuth provider");
    verifyState(String(req.query.state || ""), provider);
    const code = String(req.query.code || "");
    if (!code) throw new Error("Missing authorization code");
    const tokenPayload = await exchangeCode(provider, code);
    const profile = await fetchProfile(provider, tokenPayload.access_token);
    const user = await upsertSocialStudent(provider, profile);
    const token = socialToken(user);
    return res.redirect(`${frontendCallbackUrl()}#token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("Social login failed", { provider, message: error.message });
    return res.redirect(`${frontendCallbackUrl()}#error=${encodeURIComponent("Đăng nhập mạng xã hội thất bại. Vui lòng thử lại.")}`);
  }
}
