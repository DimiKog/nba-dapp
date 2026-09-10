import { createServer } from "node:http";
import { createPrivateKey, createPublicKey, sign } from "node:crypto";

const issuer = "http://127.0.0.1:3101";
const audience = "e2e-audience";
const keyId = "e2e-access-key";
// This is a test-only key. It must stay stable across processes because the app
// deliberately caches Cloudflare's public JWKs between production builds/runs.
const privateKey = createPrivateKey(`-----BEGIN PRIVATE KEY-----
MIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQDwifvmai7hWwia
EyzglSjXPlvtgulY1S5pSn/wz1fsllntyGnm/hc2WWU7PHi+bkx2ToU6LayyegIb
h2uIm4eEw9t4v9q6UIxvO0DT8zJLklDRBWBBWtwxyvc2m1v1883M5DJUz7l8rrh+
euDhboe09zZPhaUKtV5mUERugLHDmR48gSLGI8P65DyI3so0NVw0owPBbA6SiZEK
3spel+oeAivXNieADlqsrOSUAe21vCUi5HnfLvYPODBRHvbKbbufMyCRAxXDsj5W
+4Ecp8lXfmUULwLCPKQviMGhJ57NMk7NZc7O3UPgJLK2fRu/N8iGeKX9f4bbJiTU
IKxmaNVFAgMBAAECggEAO0D+fvMC0+xhONVG7ZcI7ccUjbR9R68SRQk/baKiKeua
wR7o6aiHrtGERLyfkOeqac1rd9q3C2tPWBk6tfb8QgoeZ0c5ukJr6d26mUu0RNYJ
FwiAPvFDQ3fYgMjyNSsnNBU1yds2+f4vgCbEfXwFLaDlbd8B+lqV49Xbma4VvFUi
SaGoqSmEiD+8OZlh5h7OOl0ks8Od7hRlwHQMZBuZ5EPLxjc2BEf4UGdLFROK+Fgd
yrpoTVAp87wlpLD9eLpI2wihQ8fUBLR9G9xtFXgB6zou8c1tC1Sd9kBdMkBxFPfB
+CMFEwDGUGYpS3B0+mCD0X0M+hj2Ra62TnZsGGE1UQKBgQD90vsBQ4fAEWHYXR//
1FyjwDsdOJ16Uf646aA3LkbXEDInZuRyHoo5+D2Ar9ddqcydXT2ujZsvaygMTCQD
WsdcXEPiB87Io+07zAsNvBbhUhP7EScQV5JgoGS1ZQgkyYwRWchExT1719QaOr/Z
pCt4tL3DpRJ1vR+FBjJ8K4xdkQKBgQDymdlgLxt+r1x+Tk/ZypbFALwZsNArbxjv
FdWhrv2jf3L1rfvEgjeu9NQviZCpVRxN9LAzb7reBQwOM+Yt+RAcB87O1RxH8j1s
XffYTAqnjPbIJ8IMLibuZ6vjUF3B/aRgui7v3f7zRp0SMUVJAY/d2stdOCFT6auO
tCvGtl/ydQKBgDLRR8G0BHy2vjE0S9DLcpSySuOJzzWLLwVUeOgzUqmCK5hp6DjU
1nXOtnmKOwMcmMO0xEGrRjOTL5xurhMh3KIoMssRJxxSfY+oRVpFmwsXhLqSb5C9
B6hi1GbgyGWdGHbs08S4/JtL1cI+muR3EuECxq9h4DVEXQgj+n2TtnGRAoGAKuCU
MdLBmkdmIpC2vjh3I0R4+lVsxXBySLdkNZpXC9GXwOJKMDYPn2V4Jxq6LaN0SDbp
+X1S2rCrq8rycMenWDztCVNTF0gyIPgOuPTfoTNh3ohgXIS/rr01/QwUNhgdOFdP
umdTCy48zp1UsI2NHtnvvX8RLOKMxsEDR7CuDo0Cf2S50fphudVuzu85qsDmTLFx
vQFqjvASwKBGg18uBRbiqLgwKkwW8KfU3+oJFxgSJoz95cGgJh0ZucD3nqwSuVi1
T1334PDPf9qqRREmcq4MqaJfqyjy7ltlezpUHxAjLtY1LjKP/wR0gB72zWLGvH5n
rem4A80w0WTfmfU2RgE=
-----END PRIVATE KEY-----`);
const publicKey = createPublicKey(privateKey);
const publicJwk = publicKey.export({ format: "jwk" });
Object.assign(publicJwk, { kid: keyId, alg: "RS256", use: "sig" });

const sessions = {
  "manager-a-subject": {
    user: { id: 1, email: "manager-a@example.test", display_name: "Manager A" },
    memberships: [
      membership("ldl", "ldl-franchise-a", "Manager A LDL", "ldl-team-a", true),
      membership("bdb", "bdb-franchise-a", "Manager A BDB", "bdb-team-a", false),
    ],
  },
  "manager-b-subject": {
    user: { id: 2, email: "manager-b@example.test", display_name: "Manager B" },
    memberships: [
      membership("ldl", "ldl-franchise-b", "xrtc", "ldl-team-b", false),
      membership("bdb", "bdb-franchise-b", "xrtc", "bdb-team-b", false),
    ],
  },
};

function membership(league, franchiseId, franchiseName, teamId, commissioner) {
  return {
    league_slug: league,
    franchise_id: franchiseId,
    franchise_name: franchiseName,
    role: commissioner ? "commissioner" : "manager",
    commissioner,
    fantrax_team_id: teamId,
    mapping_season: "2026-27",
    mapping_captured_at: "2026-09-10T08:00:00Z",
  };
}

function send(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sessionFor(request) {
  return sessions[request.headers["x-fantasy-identity-subject"]] ?? null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3101");

  if (url.pathname === "/api/health") {
    return send(response, 200, { status: "ok" });
  }
  if (url.pathname === "/cdn-cgi/access/certs") {
    return send(response, 200, { keys: [publicJwk] });
  }
  if (url.pathname === "/test/access-token") {
    const subject = url.searchParams.get("subject");
    const session = subject ? sessions[subject] : null;
    return session
      ? send(response, 200, { token: accessToken(subject, session.user) })
      : send(response, 404, { error: "Unknown test identity" });
  }
  if (url.pathname === "/api/fantasy/session") {
    const session = sessionFor(request);
    return session
      ? send(response, 200, session)
      : send(response, 401, { error: "Unknown test identity" });
  }
  if (url.pathname === "/api/nba/scoreboard" || url.pathname === "/api/nba/news") {
    return send(response, 200, []);
  }
  if (/^\/api\/fantasy\/(ldl|bdb)\/standings$/.test(url.pathname)) {
    return send(response, 200, []);
  }
  if (/^\/api\/fantasy\/(ldl|bdb)\/free-agent-radar$/.test(url.pathname)) {
    return send(response, 200, {
      league: { slug: url.pathname.includes("/bdb/") ? "bdb" : "ldl", name: "Test league" },
      categories: [],
      players: [],
    });
  }
  if (/^\/api\/fantasy\/(ldl|bdb)\/trade-suggestions$/.test(url.pathname)) {
    let rawBody = "";
    request.on("data", (chunk) => { rawBody += chunk; });
    request.on("end", () => {
      const body = JSON.parse(rawBody || "{}");
      send(response, 200, {
        selected_team_id: body.selected_team_id,
        identity_subject: request.headers["x-fantasy-identity-subject"],
        suggestions: [],
      });
    });
    return;
  }

  send(response, 404, { error: `No E2E fixture for ${url.pathname}` });
});

function accessToken(subject, user) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", kid: keyId, typ: "JWT" });
  const payload = encode({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 3_600,
    iss: issuer,
    sub: subject,
    email: user.email,
    name: user.display_name,
  });
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey)
    .toString("base64url");
  return `${header}.${payload}.${signature}`;
}

server.listen(3101, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
