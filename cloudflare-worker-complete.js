// Cloudflare Worker - 完整后端代码（签名 + 域名双保险安全版本）
// 替代 Lovable Cloud/Supabase 的所有功能

// ==================== 安全配置 ====================
// 1️⃣ 域名白名单（只允许这些域名发起请求）
const ALLOWED_ORIGINS = [
  'https://xmm2022.github.io',
  'http://localhost:5173',  // 本地开发
  'http://localhost:8788',  // 本地 Worker 测试
];

// 2️⃣ 签名密钥（请在 Cloudflare Dashboard 设置环境变量 AUTH_SECRET）
// 生产环境使用：wrangler secret put AUTH_SECRET
// 本地测试使用：在 .dev.vars 文件中设置 AUTH_SECRET=你的密钥
const DEFAULT_AUTH_SECRET = '6093b631eb06ee06bc31352bfeb16747a363c2d5738501b9393f27aa4f65ba82';

// ==================== 安全验证函数 ====================
function verifyOrigin(request) {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  
  // 检查 Origin
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin === allowed);
    if (isAllowed) return { valid: true, origin };
  }
  
  // 回退检查 Referer
  if (referer) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed));
    if (isAllowed) return { valid: true, origin: referer };
  }
  
  return { valid: false, origin: origin || referer };
}

async function verifySignature(request, env) {
  const authHeader = request.headers.get('X-Auth-Signature');
  if (!authHeader) {
    return { valid: false, error: 'Missing X-Auth-Signature header' };
  }
  
  const secret = env.AUTH_SECRET || DEFAULT_AUTH_SECRET;
  
  // 简单的 HMAC-SHA256 验证
  // 客户端发送格式: timestamp.signature
  const [timestamp, signature] = authHeader.split('.');
  if (!timestamp || !signature) {
    return { valid: false, error: 'Invalid signature format' };
  }
  
  // 验证时间戳（5分钟内有效，防止重放攻击）
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(now - requestTime) > 300000) { // 5分钟 = 300000ms
    return { valid: false, error: 'Signature expired' };
  }
  
  // 生成预期的签名
  const message = timestamp + secret;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // 比较签名
  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }
  
  return { valid: true };
}

// ==================== 主处理函数 ====================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 🔒 安全检查 1：验证域名来源
    const originCheck = verifyOrigin(request);
    const allowedOrigin = originCheck.valid ? originCheck.origin : null;
    
    // CORS 头设置
    const corsHeaders = allowedOrigin ? {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, x-auth-signature',
      'Access-Control-Allow-Credentials': 'true',
    } : {
      'Access-Control-Allow-Origin': 'null',
    };

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: allowedOrigin ? 204 : 403,
        headers: corsHeaders 
      });
    }

    // 🔒 安全检查 2：域名白名单验证
    if (!originCheck.valid) {
      console.error('Origin blocked:', originCheck.origin);
      return new Response(JSON.stringify({ 
        error: '🚫 Access denied: Unauthorized origin',
        origin: originCheck.origin 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 🔒 安全检查 3：签名验证
    const signatureCheck = await verifySignature(request, env);
    if (!signatureCheck.valid) {
      console.error('Signature verification failed:', signatureCheck.error);
      return new Response(JSON.stringify({ 
        error: '🚫 Access denied: ' + signatureCheck.error,
        hint: 'Please ensure you have the correct authentication signature'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // 路由分发
      if (path === '/api/cloudflare-api') {
        return await handleCloudflareAPI(request, env, corsHeaders);
      } else if (path === '/api/verify-cloudflare') {
        return await handleVerifyCloudflare(request, env, corsHeaders);
      } else if (path === '/api/deploy-worker') {
        return await handleDeployWorker(request, env, corsHeaders);
      } else if (path === '/api/operation-history') {
        return await handleOperationHistory(request, env, corsHeaders);
      } else if (path === '/api/worker-templates') {
        return await handleWorkerTemplates(request, env, corsHeaders);
      } else if (path === '/api/feedback-system') {
        return await handleFeedbackSystem(request, env, corsHeaders);
      } else if (path === '/api/cf-d1-query') {
        return await handleD1Query(request, env, corsHeaders);
      } else if (path === '/api/cf-worker-analytics') {
        return await handleWorkerAnalytics(request, env, corsHeaders);
      } else {
        return new Response('Not Found', {
          status: 404,
          headers: corsHeaders 
        });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// ==================== Cloudflare API 代理 ====================
async function handleCloudflareAPI(request, env, corsHeaders) {
  const body = await request.json();
  const { 
    action, email, apiKey, zoneId, recordId, accountId, 
    data, recordData, settings, ruleData, 
    ruleId, pageRuleId, routeId, tunnelId, scriptName, workerId,
    purgeData
  } = body;
  
  // 兼容前端发送的各种数据字段
  const actualData = ruleData || recordData || data || {};
  const actualSettings = settings || actualData.settings;
  const actualRuleId = ruleId || actualData.ruleId;
  const actualPageRuleId = pageRuleId || actualData.pageRuleId || actualData.ruleId;
  const actualRouteId = routeId || actualData.routeId;
  const actualTunnelId = tunnelId || actualData.tunnelId;
  // 兼容 workerId 和 scriptName 两种参数名
  const actualScriptName = workerId || scriptName || actualData.scriptName || actualData.workerId;

  console.log(`Cloudflare API ${action}: started`);

  // Helper: fetch worker info (compatibility_date, flags)
  async function getWorkerInfo() {
    try {
      const infoResp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
        {
          method: 'GET',
          headers: {
            'X-Auth-Email': email,
            'X-Auth-Key': apiKey,
          }
        }
      );
      if (infoResp.ok) {
        const infoJson = await infoResp.json();
        return infoJson.result || {};
      }
    } catch (e) {
      console.warn('getWorkerInfo failed:', e.message);
    }
    return {};
  }

  try {
    let result;
    
    switch (action) {
      // ===== Zone 管理 =====
      case 'list_zones':
        result = await callCloudflareAPI(
          'https://api.cloudflare.com/client/v4/zones',
          'GET',
          email,
          apiKey
        );
        break;

      case 'create_zone':
        result = await callCloudflareAPI(
          'https://api.cloudflare.com/client/v4/zones',
          'POST',
          email,
          apiKey,
          actualData
        );
        break;

      case 'get_zone':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'delete_zone':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      // ===== DNS 记录管理 =====
      case 'list_dns_records':
        const dnsParams = new URLSearchParams();
        if (actualData?.type) dnsParams.append('type', actualData.type);
        if (actualData?.name) dnsParams.append('name', actualData.name);
        const dnsQuery = dnsParams.toString() ? `?${dnsParams.toString()}` : '';
        
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records${dnsQuery}`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'create_dns_record':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
          'POST',
          email,
          apiKey,
          actualData
        );
        break;

      case 'update_dns_record':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`,
          'PUT',
          email,
          apiKey,
          actualData
        );
        break;

      case 'delete_dns_record':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      // ===== Worker 管理 =====
      case 'get_account':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'get_workers_subdomain':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'list_workers':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'get_worker_script':
        // Worker 脚本获取需要特殊处理：模块脚本会以 multipart/form-data 返回
        console.log(`Getting worker script: ${actualScriptName} from account: ${accountId}`);
        console.log(`Auth check - Email: ${email ? email.substring(0, 5) + '...' : 'MISSING'}, ApiKey: ${apiKey ? 'EXISTS' : 'MISSING'}`);
        
        const scriptResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
          {
            method: 'GET',
            headers: {
              'X-Auth-Email': email,
              'X-Auth-Key': apiKey,
              // 不强制 Accept，Cloudflare 模块脚本会返回 multipart
            }
          }
        );
        
        console.log(`Script response status: ${scriptResponse.status}`);
        
        if (!scriptResponse.ok) {
          const errorText = await scriptResponse.text();
          console.error(`Script fetch error: ${errorText}`);
          try {
            const errorJson = JSON.parse(errorText);
            result = { success: false, errors: errorJson.errors || [{ message: errorText }] };
          } catch {
            result = { success: false, errors: [{ message: errorText }] };
          }
        } else {
          const contentType = scriptResponse.headers.get('content-type') || '';
          const rawText = await scriptResponse.text();

          // 解析 multipart/form-data，提取 JS 代码片段
          if (contentType.includes('multipart/form-data')) {
            const m = contentType.match(/boundary=([^;]+)/i);
            const boundary = m?.[1];

            const extractScriptFromMultipart = (body, b) => {
              const parts = body.split(`--${b}`);
              for (const p of parts) {
                const idx = p.indexOf('\r\n\r\n');
                if (idx === -1) continue;
                const header = p.slice(0, idx).toLowerCase();
                let content = p.slice(idx + 4);
                if (!header.includes('content-disposition')) continue;
                if (
                  header.includes('name="index.js"') ||
                  header.includes('name="worker.js"') ||
                  header.includes('name="script"')
                ) {
                  // 去掉末尾多余换行和结束标记
                  content = content.replace(/\r\n--\s*$/, '').replace(/\r\n$/, '');
                  return content;
                }
              }
              return null;
            };

            const extracted = boundary ? extractScriptFromMultipart(rawText, boundary) : null;
            result = { success: true, result: extracted ?? rawText };
          } else {
            result = { success: true, result: rawText };
          }
        }
        break;

      case 'upload_worker':
        // 根据脚本内容自动选择上传方式：
        // - 模块脚本(含 import/export)：使用 multipart/form-data + metadata.main_module
        // - 经典脚本：使用 multipart/form-data + metadata.body_part = 'script'
        // 重要：保留现有的 bindings（如 D1 数据库绑定）
        {
          // 1) 优先使用前端传递的 bindings，如果没有则从 API 获取
          let bindingsToUse = actualData.bindings || [];
          
          if (bindingsToUse.length > 0) {
            console.log(`Using ${bindingsToUse.length} bindings from frontend request`);
          } else {
            console.log('No bindings from frontend, fetching from API...');
            try {
              const bindingsResponse = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/bindings`,
                {
                  method: 'GET',
                  headers: {
                    'X-Auth-Email': email,
                    'X-Auth-Key': apiKey,
                  }
                }
              );
              if (bindingsResponse.ok) {
                const bindingsData = await bindingsResponse.json();
                if (bindingsData.success) {
                  const r = bindingsData.result;
                  if (Array.isArray(r)) {
                    bindingsToUse = r;
                  } else if (r && Array.isArray(r.bindings)) {
                    bindingsToUse = r.bindings;
                  } else {
                    console.warn('Unknown bindings response shape, defaulting to empty array');
                  }
                  console.log(`Fetched ${bindingsToUse.length} existing bindings from API`);
                }
              } else {
                console.warn('Failed to fetch bindings, worker may lose bindings!');
              }
            } catch (e) {
              console.error('Failed to fetch existing bindings:', e.message);
              console.warn('⚠️ Warning: Worker will be deployed without bindings!');
            }
          }

          // 2) 预清理：如果传入的是 multipart 文本（从 GET 原样粘贴），先提取纯 JS
          const extractScriptFromMultipart = (body, b) => {
            const parts = body.split(`--${b}`);
            for (const p of parts) {
              const idx = p.indexOf('\r\n\r\n');
              if (idx === -1) continue;
              const header = p.slice(0, idx).toLowerCase();
              let content = p.slice(idx + 4);
              if (!header.includes('content-disposition')) continue;
              if (
                header.includes('name="index.js"') ||
                header.includes('name="worker.js"') ||
                header.includes('name="script"')
              ) {
                content = content.replace(/\r\n--\s*$/, '').replace(/\r\n$/, '');
                return content;
              }
            }
            return null;
          };

          let script = actualData.script || '';
          if (/^--[A-Za-z0-9]/.test(script) && script.includes('Content-Disposition: form-data')) {
            const firstLine = script.split('\n', 1)[0].trim();
            const bm = firstLine.match(/^--([^\r\n-]+)/);
            const boundary = bm?.[1];
            const extracted = boundary ? extractScriptFromMultipart(script, boundary) : null;
            if (extracted) script = extracted;
          }

          // 3) 根据脚本内容判断是否为模块
          const isModule = /(^|\n)\s*(export\s+|import\s+)/m.test(script) || /export\s+default/.test(script);

          // 4) 构造表单并上传，使用确定的 bindings
          console.log(`Uploading worker with ${bindingsToUse.length} bindings`);
          const form = new FormData();
          if (isModule) {
            const metadata = { 
              main_module: 'index.js',
              bindings: bindingsToUse
            };
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('index.js', new Blob([script], { type: 'application/javascript+module' }), 'index.js');
          } else {
            const metadata = { 
              body_part: 'script',
              bindings: bindingsToUse
            };
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('script', new Blob([script], { type: 'application/javascript' }), 'script.js');
          }

          const uploadResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
            {
              method: 'PUT',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
                // 不要手动设置 Content-Type，交给 FormData 生成带 boundary 的 multipart/form-data
              },
              body: form
            }
          );

          let uploadJson;
          try {
            uploadJson = await uploadResponse.json();
          } catch (e) {
            const txt = await uploadResponse.text();
            uploadJson = { success: uploadResponse.ok, errors: uploadResponse.ok ? [] : [{ message: txt }] };
          }
          result = uploadJson;

          // 5) 上传成功后，自动启用 workers.dev 子域
          if (uploadJson.success) {
            try {
              const enableSubdomainResponse = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/subdomain`,
                {
                  method: 'POST',
                  headers: {
                    'X-Auth-Email': email,
                    'X-Auth-Key': apiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ enabled: true })
                }
              );
              const enableResult = await enableSubdomainResponse.json();
              console.log('Enable workers.dev subdomain result:', enableResult);
            } catch (e) {
              console.warn('Failed to enable workers.dev subdomain:', e.message);
            }
          }
        }
        break;

      case 'delete_worker':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      case 'get_worker_bindings':
        // 获取 Worker 的所有绑定（D1, KV, R2 等）
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/bindings`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'list_worker_routes':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'create_worker_route':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
          'POST',
          email,
          apiKey,
          actualData
        );
        break;

      case 'delete_worker_route':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes/${actualRouteId}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      // ===== 防火墙规则 =====
      case 'list_firewall_rules':
        // 优先获取新版 WAF Custom Rules（Rulesets API）
        // 如果不存在，则回退到旧版 Firewall Rules
        try {
          // 1. 尝试获取 WAF Custom Rules (Rulesets API)
          const rulesetResult = await callCloudflareAPI(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/phases/http_request_firewall_custom/entrypoint`,
            'GET',
            email,
            apiKey
          );
          
          if (rulesetResult.success && rulesetResult.result?.rules?.length > 0) {
            // 找到了 WAF Custom Rules，返回这些规则
            result = {
              success: true,
              result: rulesetResult.result.rules.map(rule => ({
                id: rule.id,
                description: rule.description || 'Unnamed rule',
                expression: rule.expression,
                action: rule.action,
                enabled: rule.enabled !== false, // enabled 字段表示启用状态
                paused: rule.enabled === false,  // 将 enabled 转换为 paused 以保持兼容
                version: rule.version,
                last_updated: rule.last_updated,
                ref: rule.ref,
                // 标记这是新版 WAF Custom Rule
                rule_type: 'waf_custom'
              })),
              rulesetId: rulesetResult.result.id,
              ruleset_type: 'waf_custom'
            };
            break;
          }
        } catch (err) {
          console.log('WAF Custom Rules not found, falling back to legacy Firewall Rules:', err.message);
        }
        
        // 2. 回退到旧版 Firewall Rules
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/firewall/rules`,
          'GET',
          email,
          apiKey
        );
        
        // 标记为旧版规则
        if (result.success && result.result) {
          result.ruleset_type = 'legacy_firewall';
        }
        break;

      // 获取速率限制规则列表
      case 'list_rate_limit_rules':
        const rateLimitZoneId = body.zoneId;
        const rateLimitResult = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${rateLimitZoneId}/rulesets/phases/http_ratelimit/entrypoint`,
          'GET',
          email,
          apiKey
        );
        
        // 返回规则集信息（包含 ruleset ID 和规则列表）
        result = {
          success: rateLimitResult.success,
          result: rateLimitResult.result,
          rulesetId: rateLimitResult.result?.id,
          errors: rateLimitResult.errors
        };
        break;

      // 创建速率限制规则
      case 'create_rate_limit_rule':
        const createRateLimitZoneId = body.zoneId;
        const rulesetId = body.rulesetId;
        const ruleData = body.rule;
        
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${createRateLimitZoneId}/rulesets/${rulesetId}/rules`,
          'POST',
          email,
          apiKey,
          ruleData
        );
        break;

      case 'create_firewall_rule':
        // Cloudflare 防火墙规则API需要特定格式：包含filter和action的数组
        const isPaused = (actualData.paused !== undefined)
          ? actualData.paused
          : (actualData.enabled !== undefined ? !actualData.enabled : false);
        const firewallRulePayload = [{
          filter: {
            expression: actualData.expression
          },
          action: actualData.action,
          description: actualData.description || '',
          paused: isPaused
        }];
        
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/firewall/rules`,
          'POST',
          email,
          apiKey,
          firewallRulePayload
        );
        break;

      case 'delete_firewall_rule':
        // 根据官方文档，直接删除rule即可，filter会自动处理
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/firewall/rules/${actualRuleId}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      case 'update_firewall_rule':
        // 更新防火墙规则需要两步：先更新filter，再更新rule
        try {
          // 1. 更新filter的expression
          const filterUpdatePayload = [{
            id: actualData.filterId,
            expression: actualData.expression,
            paused: actualData.paused !== undefined ? actualData.paused : false
          }];
          
          const filterResult = await callCloudflareAPI(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/filters`,
            'PUT',
            email,
            apiKey,
            filterUpdatePayload
          );
          
          if (!filterResult.success) {
            throw new Error('Filter update failed: ' + (filterResult.errors?.[0]?.message || 'Unknown error'));
          }
          
          // 2. 更新rule本身
          const ruleUpdatePayload = [{
            id: actualRuleId,
            filter: { id: actualData.filterId },
            action: actualData.action,
            description: actualData.description || '',
            paused: actualData.paused !== undefined ? actualData.paused : false
          }];
          
          result = await callCloudflareAPI(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/firewall/rules`,
            'PUT',
            email,
            apiKey,
            ruleUpdatePayload
          );
        } catch (err) {
          result = {
            success: false,
            errors: [{ message: err.message }]
          };
        }
        break;

      // ===== 缓存控制 =====
      case 'purge_cache':
        // purgeData 应该包含 purge_everything, files, tags, hosts 或 prefixes 之一
        const cacheData = purgeData || actualData || {};
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
          'POST',
          email,
          apiKey,
          cacheData
        );
        break;

      // ===== Zone 设置 =====
      case 'get_zone_settings':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'update_zone_setting':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/${actualData.setting}`,
          'PATCH',
          email,
          apiKey,
          { value: actualData.value }
        );
        break;

      // 批量更新 Zone 设置（支持多个设置）
      case 'update_zone_settings':
        const settingsToUpdate = actualSettings || [];
        const updateResults = [];
        
        for (const setting of settingsToUpdate) {
          try {
            const settingResult = await callCloudflareAPI(
              `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/${setting.id}`,
              'PATCH',
              email,
              apiKey,
              { value: setting.value }
            );
            updateResults.push({ setting: setting.id, success: settingResult.success });
          } catch (error) {
            updateResults.push({ setting: setting.id, success: false, error: error.message });
          }
        }
        
        result = {
          success: updateResults.every(r => r.success),
          result: updateResults,
          errors: updateResults.filter(r => !r.success).map(r => ({ message: `${r.setting}: ${r.error}` }))
        };
        break;

      case 'get_development_mode':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/development_mode`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'toggle_development_mode':
      case 'update_development_mode':
        // 兼容两种操作名称
        const devModeValue = settings || actualData.value || actualData;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/development_mode`,
          'PATCH',
          email,
          apiKey,
          { value: devModeValue }
        );
        break;

      // ===== 页面规则 =====
      case 'list_page_rules':
        // Cloudflare API 默认只返回 disabled 规则，需要分别查询 active 和 disabled
        const activeRules = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/pagerules?status=active`,
          'GET',
          email,
          apiKey
        );
        const disabledRules = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/pagerules?status=disabled`,
          'GET',
          email,
          apiKey
        );
        
        // 合并两个结果
        if (activeRules.success && disabledRules.success) {
          result = {
            success: true,
            result: [...(activeRules.result || []), ...(disabledRules.result || [])],
            errors: [],
            messages: []
          };
        } else {
          // 如果其中一个失败，返回成功的那个
          result = activeRules.success ? activeRules : disabledRules;
        }
        break;

      case 'create_page_rule':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/pagerules`,
          'POST',
          email,
          apiKey,
          actualData
        );
        break;

      case 'update_page_rule':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/pagerules/${actualPageRuleId}`,
          'PATCH',
          email,
          apiKey,
          actualData
        );
        break;

      case 'delete_page_rule':
        console.log('Delete page rule params:', { zoneId, pageRuleId, actualPageRuleId });
        if (!actualPageRuleId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Missing pageRuleId parameter',
            received: { pageRuleId, actualPageRuleId, body }
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/pagerules/${actualPageRuleId}`,
          'DELETE',
          email,
          apiKey
        );
        console.log('Delete page rule result:', result);
        break;

      // ===== SSL/证书 =====
      case 'list_certificates':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/ssl/certificate_packs`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'delete_certificate':
        const certificateId = body.certificateId || actualData.certificateId;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/ssl/certificate_packs/${certificateId}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      // ===== 分析 (使用 GraphQL API，返回与前端期望一致的结构) =====
      case 'get_analytics':
        // 默认最近 7 天
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const sinceIso = (actualData?.since || sevenDaysAgo.toISOString()).substring(0, 10);
        const untilIso = (actualData?.until || now.toISOString()).substring(0, 10);

        const gql = {
          query: `query GetZoneAnalytics($zoneTag: String!, $since: String!, $until: String!) {
            viewer {
              zones(filter: { zoneTag: $zoneTag }) {
                httpRequests1dGroups(
                  limit: 10000
                  filter: { date_geq: $since, date_leq: $until }
                ) {
                  dimensions { 
                    date 
                  }
                  sum { 
                    requests
                    bytes
                    threats
                    pageViews
                    cachedBytes
                    cachedRequests
                    encryptedRequests
                    encryptedBytes
                  }
                  uniq { 
                    uniques 
                  }
                }
              }
            }
          }`,
          variables: { zoneTag: zoneId, since: sinceIso, until: untilIso }
        };

        // 直接请求 GraphQL 端点，确保 header 正确
        const gqlResp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
          method: 'POST',
          headers: {
            'X-Auth-Email': email,
            'X-Auth-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gql)
        });
        const gqlJson = await gqlResp.json();

        if (gqlJson.errors) {
          result = { success: false, errors: gqlJson.errors };
        } else {
          // 与前端保持一致：data.result = graphql.data
          result = { success: true, result: gqlJson.data };
        }
        break;

      // ===== KV 命名空间 =====
      case 'list_kv_namespaces':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'create_kv_namespace':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`,
          'POST',
          email,
          apiKey,
          actualData
        );
        break;

      case 'delete_kv_namespace':
        const namespaceId = body.namespaceId || actualData.namespaceId;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      // ===== D1 数据库 =====
      case 'list_d1_databases':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'create_d1_database':
        // D1 创建多策略重试：primary_location_hint/jurisdiction 兼容性处理
        {
          const strategies = [
            { label: 'hint+juris', hint: actualData.primary_location_hint || 'auto', includeJuris: true },
            { label: 'hint:auto', hint: 'auto', includeJuris: false },
            { label: 'no hint', hint: null, includeJuris: false },
          ];
          
          let lastErr = null;
          for (const s of strategies) {
            const payload = { name: actualData.name };
            if (s.hint) payload.primary_location_hint = s.hint;
            if (s.includeJuris && s.hint) payload.jurisdiction = s.hint;
            
            console.log(`D1 create attempt: ${s.label}`, payload);
            const attemptResult = await callCloudflareAPI(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
              'POST',
              email,
              apiKey,
              payload
            );
            
            if (attemptResult?.success) {
              console.log(`✅ D1 created via ${s.label}`);
              result = attemptResult;
              break;
            } else {
              lastErr = attemptResult;
              console.warn(`D1 create failed via ${s.label}:`, attemptResult?.errors?.[0]?.message);
            }
          }
          
          if (!result) result = lastErr;
        }
        break;

      case 'bind_d1_to_worker':
        // 绑定D1数据库到Worker需要重新上传脚本并在metadata中包含bindings
        {
          // 1. 先获取当前 Worker 脚本
          const scriptResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
            {
              method: 'GET',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
              }
            }
          );
          
          if (!scriptResponse.ok) {
            const errorText = await scriptResponse.text();
            result = { success: false, errors: [{ message: `获取 Worker 脚本失败: ${errorText}` }] };
            break;
          }
          
          const contentType = scriptResponse.headers.get('content-type') || '';
          const rawText = await scriptResponse.text();
          
          // 解析 multipart/form-data，提取 JS 代码
          let script = rawText;
          if (contentType.includes('multipart/form-data')) {
            const m = contentType.match(/boundary=([^;]+)/i);
            const boundary = m?.[1];
            
            if (boundary) {
              const extractScriptFromMultipart = (body, b) => {
                const parts = body.split(`--${b}`);
                for (const p of parts) {
                  const idx = p.indexOf('\r\n\r\n');
                  if (idx === -1) continue;
                  const header = p.slice(0, idx).toLowerCase();
                  let content = p.slice(idx + 4);
                  if (!header.includes('content-disposition')) continue;
                  if (
                    header.includes('name="index.js"') ||
                    header.includes('name="worker.js"') ||
                    header.includes('name="script"')
                  ) {
                    content = content.replace(/\r\n--\s*$/, '').replace(/\r\n$/, '');
                    return content;
                  }
                }
                return null;
              };
              
              const extracted = extractScriptFromMultipart(rawText, boundary);
              if (extracted) script = extracted;
            }
          }
          
          // 2. 获取现有 bindings
          let existingBindings = [];
          try {
            const bindingsResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/bindings`,
              {
                method: 'GET',
                headers: {
                  'X-Auth-Email': email,
                  'X-Auth-Key': apiKey,
                }
              }
            );
            if (bindingsResponse.ok) {
              const bindingsData = await bindingsResponse.json();
              if (bindingsData.success && bindingsData.result) {
                existingBindings = Array.isArray(bindingsData.result) 
                  ? bindingsData.result 
                  : (bindingsData.result.bindings || []);
              }
            }
          } catch (e) {
            console.warn('Failed to fetch existing bindings:', e.message);
          }
          
          // 3. 移除同名旧绑定，排除 secret_text 类型（API 不返回值，无法重新提交）
          const filteredBindings = existingBindings
            .filter(b => b.name !== actualData.binding_name)
            .filter(b => b.type !== 'secret_text'); // 完全排除 secret_text，避免 "missing text property" 错误
          
          const newBindings = [
            ...filteredBindings,
            {
              type: 'd1',
              name: actualData.binding_name,
              id: actualData.database_id
            }
          ];
          
          // 4. 判断脚本类型并重新上传
          const isModule = /(^|\n)\s*(export\s+|import\s+)/m.test(script) || /export\s+default/.test(script);
          
          const form = new FormData();
          if (isModule) {
            const info = await getWorkerInfo();
            const metadata = { 
              main_module: 'index.js',
              bindings: newBindings
            };
            if (info.compatibility_date) metadata.compatibility_date = info.compatibility_date;
            // Ensure nodejs_compat when script imports node: modules
            let flags = Array.isArray(info.compatibility_flags) ? [...info.compatibility_flags] : [];
            const needsNode = /['"]node:/.test(script);
            if (needsNode && !flags.includes('nodejs_compat')) flags.push('nodejs_compat');
if (flags.length) { metadata.compatibility_flags = flags; if (!metadata.compatibility_date) { metadata.compatibility_date = info.compatibility_date || new Date().toISOString().slice(0,10); } }
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('index.js', new Blob([script], { type: 'application/javascript+module' }), 'index.js');
          } else {
            const info = await getWorkerInfo();
            const metadata = { 
              body_part: 'script',
              bindings: newBindings
            };
            if (info.compatibility_date) metadata.compatibility_date = info.compatibility_date;
            let flags = Array.isArray(info.compatibility_flags) ? [...info.compatibility_flags] : [];
            const needsNode = /['"]node:/.test(script);
            if (needsNode && !flags.includes('nodejs_compat')) flags.push('nodejs_compat');
if (flags.length) { metadata.compatibility_flags = flags; if (!metadata.compatibility_date) { metadata.compatibility_date = info.compatibility_date || new Date().toISOString().slice(0,10); } }
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('script', new Blob([script], { type: 'application/javascript' }), 'script.js');
          }
          
          // 5. 上传 Worker
          const uploadResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
            {
              method: 'PUT',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
              },
              body: form
            }
          );
          
          let uploadJson;
          try {
            uploadJson = await uploadResponse.json();
          } catch (e) {
            const txt = await uploadResponse.text();
            uploadJson = { success: uploadResponse.ok, errors: uploadResponse.ok ? [] : [{ message: txt }] };
          }
          result = uploadJson;
        }
        break;

      case 'execute_d1_query':
        // 执行 D1 SQL 查询
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${body.databaseId}/query`,
          'POST',
          email,
          apiKey,
          { sql: body.sql }
        );
        break;

      case 'delete_d1_database':
        const databaseId = body.databaseId || actualData.databaseId;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      // ===== R2 存储 =====
      case 'list_r2_buckets':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'create_r2_bucket':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`,
          'POST',
          email,
          apiKey,
          actualData
        );
        break;

      case 'delete_r2_bucket':
        const bucketName = body.bucketName || actualData.bucketName || actualData.name;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      case 'bind_r2_to_worker':
        // 绑定 R2 存储桶到 Worker（类似 D1 绑定逻辑）
        {
          const scriptResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
            {
              method: 'GET',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
              }
            }
          );
          
          if (!scriptResponse.ok) {
            result = { success: false, errors: [{ message: '获取 Worker 脚本失败' }] };
            break;
          }
          
          const contentType = scriptResponse.headers.get('content-type') || '';
          const rawText = await scriptResponse.text();
          let script = rawText;
          
          if (contentType.includes('multipart/form-data')) {
            const m = contentType.match(/boundary=([^;]+)/i);
            const boundary = m?.[1];
            if (boundary) {
              const extractScriptFromMultipart = (body, b) => {
                const parts = body.split(`--${b}`);
                for (const p of parts) {
                  const idx = p.indexOf('\r\n\r\n');
                  if (idx === -1) continue;
                  const header = p.slice(0, idx).toLowerCase();
                  let content = p.slice(idx + 4);
                  if (!header.includes('content-disposition')) continue;
                  if (
                    header.includes('name="index.js"') ||
                    header.includes('name="worker.js"') ||
                    header.includes('name="script"')
                  ) {
                    content = content.replace(/\r\n--\s*$/, '').replace(/\r\n$/, '');
                    return content;
                  }
                }
                return null;
              };
              const extracted = extractScriptFromMultipart(rawText, boundary);
              if (extracted) script = extracted;
            }
          }
          
          let existingBindings = [];
          try {
            const bindingsResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/bindings`,
              {
                method: 'GET',
                headers: {
                  'X-Auth-Email': email,
                  'X-Auth-Key': apiKey,
                }
              }
            );
            if (bindingsResponse.ok) {
              const bindingsData = await bindingsResponse.json();
              if (bindingsData.success && bindingsData.result) {
                existingBindings = Array.isArray(bindingsData.result) 
                  ? bindingsData.result 
                  : (bindingsData.result.bindings || []);
              }
            }
          } catch (e) {
            console.warn('Failed to fetch existing bindings:', e.message);
          }
          
          // 排除 secret_text 类型（API 不返回值，无法重新提交）
          const filteredBindings = existingBindings
            .filter(b => b.name !== actualData.binding_name)
            .filter(b => b.type !== 'secret_text'); // 完全排除 secret_text，避免 "missing text property" 错误
          
          const newBindings = [
            ...filteredBindings,
            {
              type: 'r2_bucket',
              name: actualData.binding_name,
              bucket_name: actualData.bucket_name
            }
          ];
          
          const isModule = /(^|\n)\s*(export\s+|import\s+)/m.test(script) || /export\s+default/.test(script);
          const form = new FormData();
          
          if (isModule) {
            const info = await getWorkerInfo();
            const metadata = { 
              main_module: 'index.js',
              bindings: newBindings
            };
            if (info.compatibility_date) metadata.compatibility_date = info.compatibility_date;
            let flags = Array.isArray(info.compatibility_flags) ? [...info.compatibility_flags] : [];
            const needsNode = /['"]node:/.test(script);
            if (needsNode && !flags.includes('nodejs_compat')) flags.push('nodejs_compat');
if (flags.length) { metadata.compatibility_flags = flags; if (!metadata.compatibility_date) { metadata.compatibility_date = info.compatibility_date || new Date().toISOString().slice(0,10); } }
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('index.js', new Blob([script], { type: 'application/javascript+module' }), 'index.js');
          } else {
            const info = await getWorkerInfo();
            const metadata = { 
              body_part: 'script',
              bindings: newBindings
            };
            if (info.compatibility_date) metadata.compatibility_date = info.compatibility_date;
            let flags = Array.isArray(info.compatibility_flags) ? [...info.compatibility_flags] : [];
            const needsNode = /['"]node:/.test(script);
            if (needsNode && !flags.includes('nodejs_compat')) flags.push('nodejs_compat');
if (flags.length) { metadata.compatibility_flags = flags; if (!metadata.compatibility_date) { metadata.compatibility_date = info.compatibility_date || new Date().toISOString().slice(0,10); } }
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('script', new Blob([script], { type: 'application/javascript' }), 'script.js');
          }
          
          const uploadResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
            {
              method: 'PUT',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
              },
              body: form
            }
          );
          
          let uploadJson;
          try {
            uploadJson = await uploadResponse.json();
          } catch (e) {
            const txt = await uploadResponse.text();
            uploadJson = { success: uploadResponse.ok, errors: uploadResponse.ok ? [] : [{ message: txt }] };
          }
          result = uploadJson;
        }
        break;

      case 'bind_kv_to_worker':
        // 绑定 KV 命名空间到 Worker
        {
          const scriptResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
            {
              method: 'GET',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
              }
            }
          );
          
          if (!scriptResponse.ok) {
            result = { success: false, errors: [{ message: '获取 Worker 脚本失败' }] };
            break;
          }
          
          const contentType = scriptResponse.headers.get('content-type') || '';
          const rawText = await scriptResponse.text();
          let script = rawText;
          
          if (contentType.includes('multipart/form-data')) {
            const m = contentType.match(/boundary=([^;]+)/i);
            const boundary = m?.[1];
            if (boundary) {
              const extractScriptFromMultipart = (body, b) => {
                const parts = body.split(`--${b}`);
                for (const p of parts) {
                  const idx = p.indexOf('\r\n\r\n');
                  if (idx === -1) continue;
                  const header = p.slice(0, idx).toLowerCase();
                  let content = p.slice(idx + 4);
                  if (!header.includes('content-disposition')) continue;
                  if (
                    header.includes('name="index.js"') ||
                    header.includes('name="worker.js"') ||
                    header.includes('name="script"')
                  ) {
                    content = content.replace(/\r\n--\s*$/, '').replace(/\r\n$/, '');
                    return content;
                  }
                }
                return null;
              };
              const extracted = extractScriptFromMultipart(rawText, boundary);
              if (extracted) script = extracted;
            }
          }
          
          let existingBindings = [];
          try {
            const bindingsResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/bindings`,
              {
                method: 'GET',
                headers: {
                  'X-Auth-Email': email,
                  'X-Auth-Key': apiKey,
                }
              }
            );
            if (bindingsResponse.ok) {
              const bindingsData = await bindingsResponse.json();
              if (bindingsData.success && bindingsData.result) {
                existingBindings = Array.isArray(bindingsData.result) 
                  ? bindingsData.result 
                  : (bindingsData.result.bindings || []);
              }
            }
          } catch (e) {
            console.warn('Failed to fetch existing bindings:', e.message);
          }
          
          // 排除 secret_text 类型（API 不返回值，无法重新提交）
          const filteredBindings = existingBindings
            .filter(b => b.name !== actualData.binding_name)
            .filter(b => b.type !== 'secret_text'); // 完全排除 secret_text，避免 "missing text property" 错误
          
          const newBindings = [
            ...filteredBindings,
            {
              type: 'kv_namespace',
              name: actualData.binding_name,
              namespace_id: actualData.namespace_id
            }
          ];
          
          const isModule = /(^|\n)\s*(export\s+|import\s+)/m.test(script) || /export\s+default/.test(script);
          const form = new FormData();
          
          if (isModule) {
            const info = await getWorkerInfo();
            const metadata = { 
              main_module: 'index.js',
              bindings: newBindings
            };
            if (info.compatibility_date) metadata.compatibility_date = info.compatibility_date;
            let flags = Array.isArray(info.compatibility_flags) ? [...info.compatibility_flags] : [];
            const needsNode = /['"]node:/.test(script);
            if (needsNode && !flags.includes('nodejs_compat')) flags.push('nodejs_compat');
if (flags.length) { metadata.compatibility_flags = flags; if (!metadata.compatibility_date) { metadata.compatibility_date = info.compatibility_date || new Date().toISOString().slice(0,10); } }
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('index.js', new Blob([script], { type: 'application/javascript+module' }), 'index.js');
          } else {
            const info = await getWorkerInfo();
            const metadata = { 
              body_part: 'script',
              bindings: newBindings
            };
            if (info.compatibility_date) metadata.compatibility_date = info.compatibility_date;
            let flags = Array.isArray(info.compatibility_flags) ? [...info.compatibility_flags] : [];
            const needsNode = /['"]node:/.test(script);
            if (needsNode && !flags.includes('nodejs_compat')) flags.push('nodejs_compat');
if (flags.length) { metadata.compatibility_flags = flags; if (!metadata.compatibility_date) { metadata.compatibility_date = info.compatibility_date || new Date().toISOString().slice(0,10); } }
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('script', new Blob([script], { type: 'application/javascript' }), 'script.js');
          }
          
          const uploadResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
            {
              method: 'PUT',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
              },
              body: form
            }
          );
          
          let uploadJson;
          try {
            uploadJson = await uploadResponse.json();
          } catch (e) {
            const txt = await uploadResponse.text();
            uploadJson = { success: uploadResponse.ok, errors: uploadResponse.ok ? [] : [{ message: txt }] };
          }
          result = uploadJson;
        }
        break;

      case 'get_worker_settings':
        // 获取 Worker 设置（包括 bindings）
        {
          const bindingsResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/bindings`,
            {
              method: 'GET',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
              }
            }
          );
          
          if (bindingsResponse.ok) {
            result = await bindingsResponse.json();
          } else {
            result = { success: false, errors: [{ message: '获取 Worker 设置失败' }] };
          }
        }
        break;

      case 'update_worker_variables':
        // 更新 Worker 环境变量
        {
          const scriptResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
            {
              method: 'GET',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
              }
            }
          );
          
          if (!scriptResponse.ok) {
            result = { success: false, errors: [{ message: '获取 Worker 脚本失败' }] };
            break;
          }
          
          const contentType = scriptResponse.headers.get('content-type') || '';
          const rawText = await scriptResponse.text();
          let script = rawText;
          
          if (contentType.includes('multipart/form-data')) {
            const m = contentType.match(/boundary=([^;]+)/i);
            const boundary = m?.[1];
            if (boundary) {
              const extractScriptFromMultipart = (body, b) => {
                const parts = body.split(`--${b}`);
                for (const p of parts) {
                  const idx = p.indexOf('\r\n\r\n');
                  if (idx === -1) continue;
                  const header = p.slice(0, idx).toLowerCase();
                  let content = p.slice(idx + 4);
                  if (!header.includes('content-disposition')) continue;
                  if (
                    header.includes('name="index.js"') ||
                    header.includes('name="worker.js"') ||
                    header.includes('name="script"')
                  ) {
                    content = content.replace(/\r\n--\s*$/, '').replace(/\r\n$/, '');
                    return content;
                  }
                }
                return null;
              };
              const extracted = extractScriptFromMultipart(rawText, boundary);
              if (extracted) script = extracted;
            }
          }
          
          let existingBindings = [];
          try {
            const bindingsResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/bindings`,
              {
                method: 'GET',
                headers: {
                  'X-Auth-Email': email,
                  'X-Auth-Key': apiKey,
                }
              }
            );
            if (bindingsResponse.ok) {
              const bindingsData = await bindingsResponse.json();
              if (bindingsData.success && bindingsData.result) {
                // Cloudflare API 返回的是 { result: [...] } 直接就是绑定数组
                existingBindings = Array.isArray(bindingsData.result) 
                  ? bindingsData.result 
                  : (bindingsData.result.bindings || []);
              }
            }
          } catch (e) {
            console.warn('Failed to fetch existing bindings:', e.message);
          }
          
          // 获取当前所有密钥名称（用于检测要删除的密钥）
          const currentSecretNames = existingBindings
            .filter(b => b.type === 'secret_text')
            .map(b => b.name);
          
          const keepSecretNames = new Set(actualData.keepSecrets || []);
          
          // 要删除的密钥 = 当前存在但不在 keepSecrets 中的
          const secretsToDelete = currentSecretNames.filter(name => !keepSecretNames.has(name));
          
          // 仅保留非变量绑定（secret_text 不能通过 metadata 设置，必须通过专用 API）
          const newNames = new Set(actualData.variables.map(v => v.name));
          const filteredBindings = existingBindings
            .filter(b => {
              if (b.type === 'plain_text') return false;
              if (b.type === 'secret_text') return false; // 密钥通过专用 API 管理，不放入 bindings
              if (b.type === 'json' && newNames.has(b.name)) return false;
              return true;
            });
          
          // 添加新的变量绑定（密钥通过 secrets API 单独设置，不放入 bindings）
          const secretsToSet = [];
          const variableBindings = actualData.variables
            .map(v => {
              if (v.type === 'json') {
                return { type: 'json', name: v.name, json: v.value };
              }
              if (v.type === 'secret_text') {
                secretsToSet.push({ name: v.name, text: v.value });
                return null; // 密钥不放入 bindings
              }
              return { type: 'plain_text', name: v.name, text: v.value };
            })
            .filter(Boolean);
          
          const newBindings = [...filteredBindings, ...variableBindings];
          
          const hasD1Binding = newBindings.some(b => b.type === 'd1') || existingBindings.some(b => b.type === 'd1');
          const isModule = hasD1Binding || /(^|\n)\s*(export\s+|import\s+)/m.test(script) || /export\s+default/.test(script);
          const form = new FormData();
          
          if (isModule) {
            const info = await getWorkerInfo();
            const metadata = { 
              main_module: 'index.js',
              bindings: newBindings
            };
            if (info.compatibility_date) metadata.compatibility_date = info.compatibility_date;
            let flags = Array.isArray(info.compatibility_flags) ? [...info.compatibility_flags] : [];
            const needsNode = /['"]node:/.test(script);
            if (needsNode && !flags.includes('nodejs_compat')) flags.push('nodejs_compat');
if (flags.length) { metadata.compatibility_flags = flags; if (!metadata.compatibility_date) { metadata.compatibility_date = info.compatibility_date || new Date().toISOString().slice(0,10); } }
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('index.js', new Blob([script], { type: 'application/javascript+module' }), 'index.js');
          } else {
            const info = await getWorkerInfo();
            const metadata = { 
              body_part: 'script',
              bindings: newBindings
            };
            if (info.compatibility_date) metadata.compatibility_date = info.compatibility_date;
            let flags = Array.isArray(info.compatibility_flags) ? [...info.compatibility_flags] : [];
            const needsNode = /['"]node:/.test(script);
            if (needsNode && !flags.includes('nodejs_compat')) flags.push('nodejs_compat');
            if (flags.length) { metadata.compatibility_flags = flags; if (!metadata.compatibility_date) { metadata.compatibility_date = info.compatibility_date || new Date().toISOString().slice(0,10); } }
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            form.append('script', new Blob([script], { type: 'application/javascript' }), 'script.js');
          }
          
          const uploadResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}`,
            {
              method: 'PUT',
              headers: {
                'X-Auth-Email': email,
                'X-Auth-Key': apiKey,
              },
              body: form
            }
          );
          
          let uploadJson;
          try {
            uploadJson = await uploadResponse.json();
          } catch (e) {
            const txt = await uploadResponse.text();
            uploadJson = { success: uploadResponse.ok, errors: uploadResponse.ok ? [] : [{ message: txt }] };
          }

          // 若上传成功，处理密钥的添加和删除
          if (uploadResponse.ok) {
            // 1. 删除要移除的密钥
            for (const secretName of secretsToDelete) {
              try {
                const deleteResponse = await fetch(
                  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/secrets/${secretName}`,
                  {
                    method: 'DELETE',
                    headers: {
                      'X-Auth-Email': email,
                      'X-Auth-Key': apiKey,
                    }
                  }
                );
                const deleteJson = await deleteResponse.json();
                if (!deleteResponse.ok || !deleteJson.success) {
                  console.error(`Failed to delete secret ${secretName}:`, deleteJson);
                }
              } catch (deleteError) {
                console.error(`Error deleting secret ${secretName}:`, deleteError);
              }
            }
            
            // 2. 添加新的密钥
            for (const secret of secretsToSet) {
              try {
                const secretResponse = await fetch(
                  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${actualScriptName}/secrets`,
                  {
                    method: 'PUT',
                    headers: {
                      'X-Auth-Email': email,
                      'X-Auth-Key': apiKey,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      name: secret.name,
                      text: secret.text,
                      type: 'secret_text'
                    })
                  }
                );
                const secretJson = await secretResponse.json();
                if (!secretResponse.ok || !secretJson.success) {
                  console.error(`Failed to set secret ${secret.name}:`, secretJson);
                }
              } catch (secretError) {
                console.error(`Error setting secret ${secret.name}:`, secretError);
              }
            }
          }

          result = uploadJson;
        }
        break;

      // ===== Tunnels（Cloudflare Tunnel）=====
      case 'list_tunnels':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/cfd_tunnel`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'create_tunnel':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/cfd_tunnel`,
          'POST',
          email,
          apiKey,
          actualData
        );
        break;

      case 'delete_tunnel':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/cfd_tunnel/${actualTunnelId}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      // ===== Pages（Cloudflare Pages）=====
      case 'list_pages_projects':
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'get_pages_project':
        const projectName = body.projectName;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'list_pages_deployments':
        const pagesProjectName = body.projectName;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${pagesProjectName}/deployments`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'get_pages_deployment':
        const deploymentProjectName = body.projectName;
        const deploymentId = body.deploymentId;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${deploymentProjectName}/deployments/${deploymentId}`,
          'GET',
          email,
          apiKey
        );
        break;

      case 'retry_pages_deployment':
        const retryProjectName = body.projectName;
        const retryDeploymentId = body.deploymentId;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${retryProjectName}/deployments/${retryDeploymentId}/retry`,
          'POST',
          email,
          apiKey
        );
        break;

      case 'delete_pages_deployment':
        const deleteProjectName = body.projectName;
        const deleteDeploymentId = body.deploymentId;
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${deleteProjectName}/deployments/${deleteDeploymentId}`,
          'DELETE',
          email,
          apiKey
        );
        break;

      case 'create_pages_project':
        const createProjectName = body.projectName;
        const projectData = {
          name: createProjectName,
          production_branch: body.productionBranch || 'main'
        };
        
        // 添加构建配置
        if (body.buildCommand || body.buildOutputDirectory) {
          projectData.build_config = {};
          if (body.buildCommand) {
            projectData.build_config.build_command = body.buildCommand;
          }
          if (body.buildOutputDirectory) {
            projectData.build_config.destination_dir = body.buildOutputDirectory;
          }
        }
        
        result = await callCloudflareAPI(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
          'POST',
          email,
          apiKey,
          projectData
        );
        break;

      case 'upload_pages_files':
        // 文件上传需要使用 Direct Upload API
        const uploadProjectName = body.projectName;
        
        // 注意：实际的文件上传需要在前端通过FormData完成
        // 这里返回上传所需的信息
        result = {
          success: true,
          message: 'Please upload files using Direct Upload API',
          upload_url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${uploadProjectName}/upload`,
          instructions: 'Use multipart/form-data to upload files'
        };
        break;

      default:
        return new Response(JSON.stringify({ 
          success: false,
          error: `未知操作: ${action}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    console.log(`Cloudflare API ${action}: success`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`Cloudflare API ${action}: failed`, error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ==================== 验证 Cloudflare 凭证 ====================
async function handleVerifyCloudflare(request, env, corsHeaders) {
  const { email, apiKey, userId } = await request.json();

  if (!email || !apiKey) {
    return new Response(JSON.stringify({ 
      success: false,
      error: '缺少必要参数' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 验证 Cloudflare 凭证 - 使用 /user 端点验证 Global API Key
    const response = await fetch('https://api.cloudflare.com/client/v4/user', {
      method: 'GET',
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success || !response.ok) {
      console.error('Cloudflare API 验证失败:', data);
      return new Response(JSON.stringify({ 
        success: false,
        error: data.errors?.[0]?.message || 'Cloudflare 凭证验证失败，请检查 Email 和 API Key 是否正确' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 保存使用记录到 D1
    if (userId && env.DB) {
      const apiKeyHash = await hashString(apiKey);
      
      await env.DB.prepare(
        'INSERT INTO cloudflare_usage (id, user_id, email, api_key_hash, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
      ).bind(
        crypto.randomUUID(),
        userId,
        email,
        apiKeyHash
      ).run();
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: '验证成功' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('验证 Cloudflare 凭证失败:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}


// ==================== 部署 Worker ====================
async function handleDeployWorker(request, env, corsHeaders) {
  const { email, apiKey, accountId, targetDomain, accessDomain, optimizedDomain, cacheTTL } = await request.json();

  if (!email || !apiKey || !targetDomain || !accessDomain) {
    return new Response(JSON.stringify({ 
      success: false,
      error: '缺少必要参数：email, apiKey, targetDomain, accessDomain' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 首先获取 Zone 和 Account ID
    const zonesResponse = await callCloudflareAPI(
      'https://api.cloudflare.com/client/v4/zones',
      'GET',
      email,
      apiKey
    );

    if (!zonesResponse.success) {
      throw new Error('无法获取 Zone 列表');
    }

    const zone = zonesResponse.result.find(z => 
      accessDomain.endsWith(z.name)
    );

    if (!zone) {
      throw new Error(`未找到域名 ${accessDomain} 对应的 Zone，请确保该域名已添加到 Cloudflare`);
    }

    // 从 zone 中获取 Account ID
    const finalAccountId = accountId || zone.account?.id;

    if (!finalAccountId) {
      throw new Error('无法获取 Account ID');
    }

    const zoneId = zone.id;
    const zoneName = zone.name;

    // 1. 创建 DNS CNAME 记录（如果访问域名不等于zone名称）
    if (accessDomain !== zoneName) {
      const subdomain = accessDomain.substring(0, accessDomain.length - zoneName.length - 1);
      
      const dnsResponse = await callCloudflareAPI(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
        'POST',
        email,
        apiKey,
        {
          type: 'CNAME',
          name: subdomain,
          content: optimizedDomain || 'cdns.doon.eu.org',
          ttl: 1,
          proxied: false
        }
      );

      // 如果记录已存在（错误代码81057），不算错误
      if (!dnsResponse.success && !dnsResponse.errors?.some(e => e.code === 81057)) {
        throw new Error(`DNS 记录创建失败: ${dnsResponse.errors?.[0]?.message || '未知错误'}`);
      }
    }

    // 2. 使用访问域名作为 Worker 名称（将点号替换为连字符）
    const workerName = accessDomain.replace(/\./g, '-');
    
    // 3. 生成 Worker 脚本
    const workerScript = generateWorkerScript(targetDomain, optimizedDomain, cacheTTL || 86400);

    // 4. 上传 Worker
    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${finalAccountId}/workers/scripts/${workerName}`,
      {
        method: 'PUT',
        headers: {
          'X-Auth-Email': email,
          'X-Auth-Key': apiKey,
          'Content-Type': 'application/javascript',
        },
        body: workerScript,
      }
    );

    const uploadData = await uploadResponse.json();
    
    if (!uploadData.success) {
      const errorMsg = uploadData.errors?.[0]?.message || 'Worker 上传失败';
      throw new Error(errorMsg);
    }

    // 5. 创建 Worker 路由
    const routeResponse = await callCloudflareAPI(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
      'POST',
      email,
      apiKey,
      {
        pattern: `${accessDomain}/*`,
        script: workerName,
      }
    );

    if (!routeResponse.success) {
      const errorMsg = routeResponse.errors?.[0]?.message || 'Worker 路由创建失败';
      throw new Error(errorMsg);
    }

    return new Response(JSON.stringify({ 
      success: true,
      workerName,
      accessDomain,
      message: 'Worker 部署成功' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('部署 Worker 失败:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ==================== 工具函数 ====================

// 调用 Cloudflare API
async function callCloudflareAPI(endpoint, method, email, apiKey, body = null, contentType = 'application/json') {
  const headers = {
    'X-Auth-Email': email,
    'X-Auth-Key': apiKey,
  };
  // 仅在需要请求体时设置 Content-Type，避免 DELETE 等请求异常
  if (body && method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = contentType;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = contentType === 'application/json' ? JSON.stringify(body) : body;
  }

  const response = await fetch(endpoint, options);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, errors: [{ message: 'Invalid JSON from Cloudflare', raw: text }] };
  }
}

// 生成 Worker 脚本
function generateWorkerScript(targetDomain, optimizedDomain, cacheTTL) {
  // 从 targetDomain 中提取主机名（去掉 https:// 前缀）
  const targetHost = targetDomain.replace(/^https?:\/\//, '');
  
  return `// 定义目标服务器地址
const TARGET_HOST = '${targetHost}';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 1. 获取原始请求的 URL
  const originalUrl = new URL(request.url);

  // 2. 构建新的目标 URL
  // 我们将请求的路径和查询参数拼接到目标主机上
  const targetUrl = new URL(originalUrl.pathname + originalUrl.search, \`https://\${TARGET_HOST}\`);

  // 3. 创建一个新的请求以发往目标服务器
  // 这里我们直接复制原始请求的大部分属性 (方法, headers, body)
  const newRequest = new Request(targetUrl, request);

  // 4. 发送请求到目标服务器
  try {
    const response = await fetch(newRequest, {
      // cf属性可以控制Cloudflare的特定功能
      cf: {
        cacheTtl: 0
      }
    });

    // 5. 将从目标服务器收到的响应直接返回给原始用户
    return response;
  } catch (e) {
    // 如果发生错误，返回一个错误信息
    return new Response('Error fetching from target server.', { status: 500 });
  }
}`;
}

// 哈希字符串（用于存储 API Key）
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =====================================================
// 操作历史 API 处理
// =====================================================
async function handleOperationHistory(request, env, corsHeaders) {
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { action, userId, operationType, resourceType, resourceName, zoneId, actionDetails, status, errorMessage, limit = 50, offset = 0, recordId } = body;

    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, error: 'Database not configured' }), {
        status: 500,
        headers: responseHeaders
      });
    }

    switch (action) {
      case 'list':
        // 自动清理 15 天前的记录
        const cleanupQuery = `
          DELETE FROM operation_history 
          WHERE user_id = ? AND created_at < datetime('now', '-15 days')
        `;
        await env.DB.prepare(cleanupQuery).bind(userId).run();
        
        // 查询操作历史
        const query = `
          SELECT * FROM operation_history 
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
        const result = await env.DB.prepare(query).bind(userId, limit, offset).all();
        return new Response(JSON.stringify({ success: true, data: result.results }), {
          headers: responseHeaders
        });

      case 'create':
        const id = crypto.randomUUID();
        const insertQuery = `
          INSERT INTO operation_history (id, user_id, operation_type, resource_type, resource_name, zone_id, action_details, status, error_message, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        await env.DB.prepare(insertQuery).bind(
          id, userId, operationType, resourceType, resourceName || null, 
          zoneId || null, actionDetails || null, status || 'success', errorMessage || null
        ).run();
        return new Response(JSON.stringify({ success: true, data: { id } }), {
          headers: responseHeaders
        });

      case 'delete':
        const deleteQuery = 'DELETE FROM operation_history WHERE id = ? AND user_id = ?';
        await env.DB.prepare(deleteQuery).bind(recordId, userId).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: responseHeaders
        });

      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
          status: 400,
          headers: responseHeaders
        });
    }
  } catch (error) {
    console.error('Operation History Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: responseHeaders
    });
  }
}

// =====================================================
// Worker 模板 API 处理
// =====================================================
async function handleWorkerTemplates(request, env, corsHeaders) {
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { action, userId, name, description, scriptContent, category, isPublic, templateId } = body;

    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, error: 'Database not configured' }), {
        status: 500,
        headers: responseHeaders
      });
    }

    switch (action) {
      case 'list':
        const listQuery = `
          SELECT * FROM worker_templates 
          WHERE user_id = ? OR is_public = 1
          ORDER BY created_at DESC
        `;
        const listResult = await env.DB.prepare(listQuery).bind(userId).all();
        return new Response(JSON.stringify({ success: true, data: listResult.results }), {
          headers: responseHeaders
        });

      case 'create':
        const id = crypto.randomUUID();
        const insertQuery = `
          INSERT INTO worker_templates (id, user_id, name, description, script_content, category, is_public, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        await env.DB.prepare(insertQuery).bind(
          id, userId, name, description || null, scriptContent, category || 'general', isPublic ? 1 : 0
        ).run();
        return new Response(JSON.stringify({ success: true, data: { id } }), {
          headers: responseHeaders
        });

      case 'update':
        const updateQuery = `
          UPDATE worker_templates 
          SET name = ?, description = ?, script_content = ?, category = ?, is_public = ?, updated_at = datetime('now')
          WHERE id = ? AND user_id = ?
        `;
        await env.DB.prepare(updateQuery).bind(
          name, description || null, scriptContent, category || 'general', isPublic ? 1 : 0, templateId, userId
        ).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: responseHeaders
        });

      case 'delete':
        const deleteQuery = 'DELETE FROM worker_templates WHERE id = ? AND user_id = ?';
        await env.DB.prepare(deleteQuery).bind(templateId, userId).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: responseHeaders
        });

      case 'increment_usage':
        const incrementQuery = 'UPDATE worker_templates SET usage_count = usage_count + 1 WHERE id = ?';
        await env.DB.prepare(incrementQuery).bind(templateId).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: responseHeaders
        });

      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
          status: 400,
          headers: responseHeaders
        });
    }
  } catch (error) {
    console.error('Worker Templates Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: responseHeaders
    });
  }
}

// =====================================================
// 反馈系统 API 处理
// =====================================================
async function handleFeedbackSystem(request, env, corsHeaders) {
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { action, userId, title, description, type, contactInfo, status, feedbackId, isAdmin } = body;

    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, error: 'Database not configured' }), {
        status: 500,
        headers: responseHeaders
      });
    }

    switch (action) {
      case 'list':
        const listQuery = `
          SELECT * FROM feedbacks 
          ORDER BY votes DESC, created_at DESC
        `;
        const listResult = await env.DB.prepare(listQuery).all();
        return new Response(JSON.stringify({ success: true, data: listResult.results }), {
          headers: responseHeaders
        });

      case 'create':
        const id = crypto.randomUUID();
        const insertQuery = `
          INSERT INTO feedbacks (id, user_id, type, title, description, contact_info, status, votes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, datetime('now'), datetime('now'))
        `;
        await env.DB.prepare(insertQuery).bind(
          id, userId, type, title, description || null, contactInfo || null
        ).run();
        return new Response(JSON.stringify({ success: true, data: { id } }), {
          headers: responseHeaders
        });

      case 'update':
        // 管理员可以更新任何反馈，普通用户只能更新自己的
        const updateQuery = isAdmin 
          ? `UPDATE feedbacks 
             SET title = ?, description = ?, type = ?, contact_info = ?, status = ?, updated_at = datetime('now')
             WHERE id = ?`
          : `UPDATE feedbacks 
             SET title = ?, description = ?, type = ?, contact_info = ?, status = ?, updated_at = datetime('now')
             WHERE id = ? AND user_id = ?`;
        
        const updateParams = isAdmin
          ? [title, description || null, type, contactInfo || null, status || 'pending', feedbackId]
          : [title, description || null, type, contactInfo || null, status || 'pending', feedbackId, userId];
        
        await env.DB.prepare(updateQuery).bind(...updateParams).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: responseHeaders
        });

      case 'delete':
        // 管理员可以删除任何反馈，普通用户只能删除自己的
        const deleteQuery = isAdmin
          ? 'DELETE FROM feedbacks WHERE id = ?'
          : 'DELETE FROM feedbacks WHERE id = ? AND user_id = ?';
        
        const deleteParams = isAdmin ? [feedbackId] : [feedbackId, userId];
        await env.DB.prepare(deleteQuery).bind(...deleteParams).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: responseHeaders
        });

      case 'vote':
        const voteQuery = 'UPDATE feedbacks SET votes = votes + 1 WHERE id = ?';
        await env.DB.prepare(voteQuery).bind(feedbackId).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: responseHeaders
        });

      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
          status: 400,
          headers: responseHeaders
        });
    }
  } catch (error) {
    console.error('Feedback System Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: responseHeaders
    });
  }
}

// =====================================================
// D1 查询 API 处理
// =====================================================
async function handleD1Query(request, env, corsHeaders) {
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { sql, params } = body;

    if (!env.DB) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Database not configured' 
      }), {
        status: 500,
        headers: responseHeaders
      });
    }

    if (!sql) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'SQL query is required' 
      }), {
        status: 400,
        headers: responseHeaders
      });
    }

    // 执行 D1 查询
    let result;
    if (params && params.length > 0) {
      result = await env.DB.prepare(sql).bind(...params).all();
    } else {
      result = await env.DB.prepare(sql).all();
    }

    return new Response(JSON.stringify({ 
      success: true,
      result: result.results || [],
      meta: result.meta || {}
    }), {
      headers: responseHeaders
    });

  } catch (error) {
    console.error('D1 Query Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: responseHeaders
    });
  }
}

// =====================================================
// Worker Analytics API 处理
// =====================================================
async function handleWorkerAnalytics(request, env, corsHeaders) {
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { email, apiKey, accountId, scriptName, since, until } = body;

    if (!email || !apiKey || !accountId) {
      return new Response(JSON.stringify({ 
        success: false, 
        errors: [{ message: 'Missing email/apiKey/accountId' }] 
      }), {
        status: 400,
        headers: responseHeaders
      });
    }

    const now = new Date();
    const sinceIso = (since ? new Date(since) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)).toISOString();
    const untilIso = (until ? new Date(until) : now).toISOString();

    // GraphQL查询
    const gql = scriptName ? {
      query: `query GetWorkerAnalytics($accountTag: String!, $scriptName: String!, $since: Time!, $until: Time!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            workersInvocationsAdaptive(
              limit: 10000
              filter: { 
                scriptName: $scriptName,
                datetime_geq: $since,
                datetime_leq: $until
              }
            ) {
              dimensions {
                date
                datetime
              }
              sum {
                requests
                errors
                subrequests
              }
              quantiles {
                cpuTimeP50
                cpuTimeP99
              }
            }
          }
        }
      }`,
      variables: { 
        accountTag: accountId, 
        scriptName: scriptName,
        since: sinceIso, 
        until: untilIso 
      },
    } : {
      query: `query GetAccountAnalytics($accountTag: String!, $since: Time!, $until: Time!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            workersInvocationsAdaptive(
              limit: 10000
              filter: { 
                datetime_geq: $since,
                datetime_leq: $until
              }
            ) {
              dimensions {
                date
                datetime
              }
              sum {
                requests
                errors
                subrequests
              }
              quantiles {
                cpuTimeP50
                cpuTimeP99
              }
            }
          }
        }
      }`,
      variables: { 
        accountTag: accountId, 
        since: sinceIso, 
        until: untilIso 
      },
    };

    const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "X-Auth-Email": email,
        "X-Auth-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gql),
    });

    const data = await resp.json();

    if (!resp.ok || data?.errors) {
      console.error("cf-worker-analytics error:", data?.errors || resp.statusText);
      return new Response(JSON.stringify({ 
        success: false, 
        errors: data?.errors || [{ message: resp.statusText }] 
      }), {
        status: 200,
        headers: responseHeaders
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      result: data?.data 
    }), {
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Worker Analytics Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      errors: [{ message: error.message }] 
    }), {
      status: 500,
      headers: responseHeaders
    });
  }
}