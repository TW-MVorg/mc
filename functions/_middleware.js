// Worker/Pages Function 程式碼：只處理 API 邏輯
const KV_BINDING_NAME = 'STATUS_DATA'; 
const API_PATH = '/api/status';
const KV_KEY = 'current_server_status';

// 處理所有的 API 請求
export const onRequest = async ({ request, env }) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 只有當路徑是 /api/status 時，才處理
    if (path === API_PATH) {
        
        const STATUS_KV = env[KV_BINDING_NAME];

        // --- 1. 處理 POST 請求 (更新狀態) ---
        if (request.method === 'POST') {
            try {
                const data = await request.json();
                
                if (!data.status || !data.message) {
                    return new Response(JSON.stringify({ error: 'Invalid data format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                }

                // 將新狀態寫入 KV 命名空間
                await STATUS_KV.put(KV_KEY, JSON.stringify(data));
                
                return new Response(JSON.stringify({ success: true, message: 'Status updated' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
                
            } catch (e) {
                return new Response(JSON.stringify({ error: 'Processing error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
            }
        }

        // --- 2. 處理 GET 請求 (讀取狀態) ---
        if (request.method === 'GET') {
            try {
                const statusJson = await STATUS_KV.get(KV_KEY);
                
                let statusData;
                if (statusJson) {
                    statusData = JSON.parse(statusJson);
                } else {
                    // 預設狀態為 'unknown'
                    statusData = { status: 'unknown', message: '頁面已載入，請管理員更新。' };
                }
                
                return new Response(JSON.stringify(statusData), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });

            } catch (e) {
                return new Response(JSON.stringify({ error: 'KV read failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
            }
        }
    }
    
    // 如果不是 /api/status 請求，繼續處理 Pages 靜態檔案
    return env.ASSETS.fetch(request);
};
