// TC3-HMAC-SHA256 signer for Tencent Cloud API.
// Spec: https://cloud.tencent.com/document/api/213/30654

const encoder = new TextEncoder();

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBytes(data) {
  return typeof data === "string" ? encoder.encode(data) : data;
}

async function sha256Hex(data) {
  const hash = await crypto.subtle.digest("SHA-256", toBytes(data));
  return bytesToHex(new Uint8Array(hash));
}

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toBytes(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, toBytes(data));
  return new Uint8Array(signature);
}

async function hmacHex(key, data) {
  return bytesToHex(await hmac(key, data));
}

export async function signTc3({
  secretId,
  secretKey,
  service,
  host,
  action,
  version,
  region,
  payload,
  timestamp,
}) {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const date = new Date(ts * 1000).toISOString().slice(0, 10);
  const payloadJson = JSON.stringify(payload ?? {});

  const algorithm = "TC3-HMAC-SHA256";
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
  const signedHeaders = "content-type;host";
  const hashedRequestPayload = await sha256Hex(payloadJson);
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join("\n");

  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const stringToSign = `${algorithm}\n${ts}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const secretDate = await hmac(`TC3${secretKey}`, date);
  const secretService = await hmac(secretDate, service);
  const secretSigning = await hmac(secretService, "tc3_request");
  const signature = await hmacHex(secretSigning, stringToSign);
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization: authorization,
    "X-TC-Timestamp": String(ts),
    "X-TC-Action": action,
    "X-TC-Version": version,
    "X-TC-Region": region || "",
    "Content-Type": "application/json; charset=utf-8",
    Host: host,
  };
}
