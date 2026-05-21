// 前端签名生成工具
// 与 Worker 的签名验证保持一致

// 默认密钥（与 Worker 保持一致）
const DEFAULT_AUTH_SECRET = '6093b631eb06ee06bc31352bfeb16747a363c2d5738501b9393f27aa4f65ba82';

/**
 * 生成请求签名
 * @param secret 签名密钥（可选，默认使用内置密钥）
 * @returns 签名字符串 (格式: timestamp.signature)
 */
export async function generateAuthSignature(secret: string = DEFAULT_AUTH_SECRET): Promise<string> {
  const timestamp = Date.now().toString();
  
  // 生成签名：SHA256(timestamp + secret)
  const message = timestamp + secret;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${timestamp}.${signature}`;
}

/**
 * 为请求添加签名头
 * @param headers 原始请求头
 * @param secret 签名密钥（可选）
 * @returns 包含签名的新请求头
 */
export async function addAuthSignature(
  headers: HeadersInit = {},
  secret?: string
): Promise<Record<string, string>> {
  const signature = await generateAuthSignature(secret);
  
  return {
    ...(headers as Record<string, string>),
    'X-Auth-Signature': signature,
  };
}
