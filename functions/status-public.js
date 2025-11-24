// functions/status-public.js

const KV_BINDING_NAME = 'STATUS_DATA'; 
const KV_KEY = 'current_server_status';

/**
 * 處理公開的 GET 請求 (讀取伺服器狀態)
 * 映射到 /status-public 路徑。
 */
export async function onRequest(context) {
    if (context.request.method !== 'GET') {
        return new Response('Method Not Allowed. Only GET is permitted.', { status: 405 });
    }
    
    const STATUS_KV = context.env[KV_BINDING_NAME];
    
    if (!STATUS_KV) {
        return new Response(JSON.stringify({ status: 'api_error', message: 'Functions 內部錯誤：KV 綁定缺失。' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const statusJson = await STATUS_KV.get(KV_KEY);
        
        let statusData;
        if (statusJson) {
            statusData = JSON.parse(statusJson);
        } else {
            statusData = { status: 'unknown', message: 'KV 尚未寫入狀態，請管理員首次更新。' };
        }
        
        return new Response(JSON.stringify(statusData), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });

    } catch (e) {
        return new Response(JSON.stringify({ status: 'api_error', message: `Functions 內部錯誤：讀取失敗。` }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}
