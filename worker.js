/**
 * Cloudflare Worker - 蜘蛛网络后端服务
 * 替代所有 Supabase Edge Functions
 * 
 * 环境变量需要配置：
 * - DB: D1 数据库绑定
 * - CLOUDFLARE_API_EMAIL: (可选) Cloudflare API 邮箱
 * - CLOUDFLARE_API_KEY: (可选) Cloudflare API 密钥
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 路由处理
      if (url.pathname === '/api/cloudflare') {
        return await handleCloudflareAPI(request, env);
      }
      
      if (url.pathname === '/api/deploy-worker') {
        return await handleDeployWorker(request, env);
      }
      
      if (url.pathname === '/api/verify-cloudflare') {
        return await handleVerifyCloudflare(request, env);
      }

      // 数据库 API 路由
      if (url.pathname.startsWith('/api/db/')) {
        return await handleDatabaseAPI(request, env, url.pathname);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message }, 500);
    }
  },
};

// =====================================================
// 工具函数
// =====================================================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateUUID() {
  return crypto.randomUUID();
}

// =====================================================
// Cloudflare API 代理
// =====================================================

async function handleCloudflareAPI(request, env) {
  try {
    const { action, email, apiKey, ...params } = await request.json();

    if (!action || !email || !apiKey) {
      return jsonResponse({ 
        success: false, 
        error: 'Missing required parameters' 
      }, 400);
    }

    const result = await callCloudflareAPI(action, email, apiKey, params);
    return jsonResponse(result);
  } catch (error) {
    console.error('Cloudflare API error:', error);
    return jsonResponse({ 
      success: false, 
      error: error.message 
    }, 500);
  }
}

async function callCloudflareAPI(action, email, apiKey, params) {
  const baseUrl = 'https://api.cloudflare.com/client/v4';
  
  const endpoints = {
    // Zone 管理
    'list-zones': { method: 'GET', path: '/zones' },
    'get-zone': { method: 'GET', path: `/zones/${params.zoneId}` },
    'create-zone': { method: 'POST', path: '/zones', body: params },
    'delete-zone': { method: 'DELETE', path: `/zones/${params.zoneId}` },
    
    // DNS 记录
    'list-dns-records': { method: 'GET', path: `/zones/${params.zoneId}/dns_records` },
    'create-dns-record': { method: 'POST', path: `/zones/${params.zoneId}/dns_records`, body: params.record },
    'update-dns-record': { method: 'PUT', path: `/zones/${params.zoneId}/dns_records/${params.recordId}`, body: params.record },
    'delete-dns-record': { method: 'DELETE', path: `/zones/${params.zoneId}/dns_records/${params.recordId}` },
    
    // Workers
    'list-workers': { method: 'GET', path: `/accounts/${params.accountId}/workers/scripts` },
    'upload-worker': { method: 'PUT', path: `/accounts/${params.accountId}/workers/scripts/${params.scriptName}`, body: params.script },
    'delete-worker': { method: 'DELETE', path: `/accounts/${params.accountId}/workers/scripts/${params.scriptName}` },
    'list-worker-routes': { method: 'GET', path: `/zones/${params.zoneId}/workers/routes` },
    'create-worker-route': { method: 'POST', path: `/zones/${params.zoneId}/workers/routes`, body: params.route },
    'delete-worker-route': { method: 'DELETE', path: `/zones/${params.zoneId}/workers/routes/${params.routeId}` },
    
    // 账户信息
    'get-accounts': { method: 'GET', path: '/accounts' },
    'get-user': { method: 'GET', path: '/user' },
    
    // 分析
    'get-analytics': { method: 'GET', path: `/zones/${params.zoneId}/analytics/dashboard` },
    
    // 防火墙规则
    'list-firewall-rules': { method: 'GET', path: `/zones/${params.zoneId}/firewall/rules` },
    'create-firewall-rule': { method: 'POST', path: `/zones/${params.zoneId}/firewall/rules`, body: params.rule },
    
    // KV 命名空间
    'list-kv-namespaces': { method: 'GET', path: `/accounts/${params.accountId}/storage/kv/namespaces` },
    'create-kv-namespace': { method: 'POST', path: `/accounts/${params.accountId}/storage/kv/namespaces`, body: params.namespace },
    
    // R2 存储桶
    'list-r2-buckets': { method: 'GET', path: `/accounts/${params.accountId}/r2/buckets` },
    'create-r2-bucket': { method: 'POST', path: `/accounts/${params.accountId}/r2/buckets`, body: params.bucket },
    
    // SSL/TLS
    'get-ssl-settings': { method: 'GET', path: `/zones/${params.zoneId}/settings/ssl` },
    'update-ssl-settings': { method: 'PATCH', path: `/zones/${params.zoneId}/settings/ssl`, body: params.settings },
    
    // 页面规则
    'list-page-rules': { method: 'GET', path: `/zones/${params.zoneId}/pagerules` },
    'create-page-rule': { method: 'POST', path: `/zones/${params.zoneId}/pagerules`, body: params.rule },
  };

  const endpoint = endpoints[action];
  if (!endpoint) {
    throw new Error(`Unknown action: ${action}`);
  }

  const response = await fetch(`${baseUrl}${endpoint.path}`, {
    method: endpoint.method,
    headers: {
      'X-Auth-Email': email,
      'X-Auth-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
  });

  const data = await response.json();
  return data;
}

// =====================================================
// 部署 Worker
// =====================================================

async function handleDeployWorker(request, env) {
  try {
    const { email, apiKey, targetDomain, accessDomain, optimizedDomain, cacheTtl } = await request.json();

    // 获取账户 ID
    const accountsResponse = await callCloudflareAPI('get-accounts', email, apiKey, {});
    if (!accountsResponse.success || !accountsResponse.result?.length) {
      throw new Error('无法获取 Cloudflare 账户');
    }
    const accountId = accountsResponse.result[0].id;

    // 查找匹配的 Zone
    const zonesResponse = await callCloudflareAPI('list-zones', email, apiKey, {});
    const zone = zonesResponse.result?.find(z => accessDomain.endsWith(z.name));
    if (!zone) {
      throw new Error('未找到匹配的域名区域');
    }

    // 创建 Worker 脚本
    const workerScript = generateWorkerScript(targetDomain, cacheTtl || 3600);
    const scriptName = accessDomain.replace(/\./g, '-');

    const uploadResult = await callCloudflareAPI('upload-worker', email, apiKey, {
      accountId,
      scriptName,
      script: workerScript,
    });

    // 创建 Worker 路由
    const routeResult = await callCloudflareAPI('create-worker-route', email, apiKey, {
      zoneId: zone.id,
      route: {
        pattern: `${accessDomain}/*`,
        script: scriptName,
      },
    });

    // 如果是子域名，创建 DNS 记录
    let dnsResult = null;
    if (accessDomain !== zone.name) {
      dnsResult = await callCloudflareAPI('create-dns-record', email, apiKey, {
        zoneId: zone.id,
        record: {
          type: 'CNAME',
          name: accessDomain,
          content: optimizedDomain || targetDomain,
          proxied: true,
        },
      });
    }

    return jsonResponse({
      success: true,
      worker: uploadResult,
      route: routeResult,
      dns: dnsResult,
    });
  } catch (error) {
    console.error('Deploy worker error:', error);
    return jsonResponse({ 
      success: false, 
      error: error.message 
    }, 500);
  }
}

function generateWorkerScript(targetDomain, cacheTtl) {
  return `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const targetUrl = 'https://${targetDomain}' + url.pathname + url.search
  
  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  })
  
  const response = await fetch(modifiedRequest)
  const modifiedResponse = new Response(response.body, response)
  
  modifiedResponse.headers.set('Cache-Control', 'public, max-age=${cacheTtl}')
  modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
  
  return modifiedResponse
}
  `.trim();
}

// =====================================================
// 验证 Cloudflare 凭据
// =====================================================

async function handleVerifyCloudflare(request, env) {
  try {
    const { email, apiKey } = await request.json();

    if (!email || !apiKey) {
      return jsonResponse({ 
        success: false, 
        error: '缺少必要参数' 
      }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ 
        success: false, 
        error: '邮箱格式不正确' 
      }, 400);
    }

    const result = await callCloudflareAPI('get-user', email, apiKey, {});

    if (result.success) {
      return jsonResponse({
        success: true,
        user: result.result,
      });
    } else {
      return jsonResponse({ 
        success: false, 
        error: '认证失败，请检查邮箱和 API 密钥' 
      }, 401);
    }
  } catch (error) {
    console.error('Verify Cloudflare error:', error);
    return jsonResponse({ 
      success: false, 
      error: error.message 
    }, 500);
  }
}

// =====================================================
// 数据库 API
// =====================================================

async function handleDatabaseAPI(request, env, pathname) {
  const parts = pathname.split('/').filter(Boolean);
  // /api/db/{table}/{action}
  
  if (parts.length < 3) {
    return jsonResponse({ error: 'Invalid database API path' }, 400);
  }

  const table = parts[2]; // profiles, access_codes, cloudflare_usage
  const action = parts[3]; // query, insert, update, delete

  try {
    switch (action) {
      case 'query':
        return await handleDatabaseQuery(request, env, table);
      case 'insert':
        return await handleDatabaseInsert(request, env, table);
      case 'update':
        return await handleDatabaseUpdate(request, env, table);
      case 'delete':
        return await handleDatabaseDelete(request, env, table);
      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (error) {
    console.error('Database API error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

async function handleDatabaseQuery(request, env, table) {
  const { filters, limit, offset } = await request.json();
  
  let query = `SELECT * FROM ${table}`;
  const bindings = [];
  
  if (filters && Object.keys(filters).length > 0) {
    const conditions = Object.keys(filters).map(key => {
      bindings.push(filters[key]);
      return `${key} = ?`;
    });
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  if (limit) {
    query += ` LIMIT ${parseInt(limit)}`;
  }
  
  if (offset) {
    query += ` OFFSET ${parseInt(offset)}`;
  }
  
  const result = await env.DB.prepare(query).bind(...bindings).all();
  return jsonResponse({ success: true, data: result.results });
}

async function handleDatabaseInsert(request, env, table) {
  const data = await request.json();
  
  if (!data.id) {
    data.id = generateUUID();
  }
  
  if (!data.created_at) {
    data.created_at = new Date().toISOString();
  }
  
  if (!data.updated_at) {
    data.updated_at = new Date().toISOString();
  }
  
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map(col => data[col]);
  
  const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  
  await env.DB.prepare(query).bind(...values).run();
  
  return jsonResponse({ success: true, data });
}

async function handleDatabaseUpdate(request, env, table) {
  const { id, ...updates } = await request.json();
  
  if (!id) {
    return jsonResponse({ error: 'ID is required' }, 400);
  }
  
  updates.updated_at = new Date().toISOString();
  
  const columns = Object.keys(updates);
  const setClause = columns.map(col => `${col} = ?`).join(', ');
  const values = [...columns.map(col => updates[col]), id];
  
  const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
  
  await env.DB.prepare(query).bind(...values).run();
  
  return jsonResponse({ success: true, id, updates });
}

async function handleDatabaseDelete(request, env, table) {
  const { id } = await request.json();
  
  if (!id) {
    return jsonResponse({ error: 'ID is required' }, 400);
  }
  
  const query = `DELETE FROM ${table} WHERE id = ?`;
  await env.DB.prepare(query).bind(id).run();
  
  return jsonResponse({ success: true, id });
}
