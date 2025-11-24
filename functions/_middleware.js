// functions/api/status.js

// 綁定名稱和 KV Key
const KV_BINDING_NAME = 'STATUS_DATA'; 
const KV_KEY = 'current_server_status';

// 處理 GET 請求 (讀取狀態)
export const onRequestGet = async (context) => {
    const STATUS_KV = context.env[KV_BINDING_NAME];
    
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
        // console.error('KV read failed:', e); // 建議在實際環境中啟用日誌
        return new Response(JSON.stringify({ error: 'KV read failed' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};

// 處理 POST 請求 (更新狀態)
export const onRequestPost = async (context) => {
    const STATUS_KV = context.env[KV_BINDING_NAME];

    // 處理 Cloudflare Access 驗證失敗的請求 (可選，但推薦)
    if (!context.request.headers.get('CF-Access-JWT-Assertion')) {
        // 如果您依賴 Cloudflare Access 進行授權，這裡可以攔截未驗證的請求
        // return new Response('Authorization Required', { status: 403 });
    }

    try {
        const data = await context.request.json();
        
        if (!data.status || !data.message) {
            return new Response(JSON.stringify({ error: 'Invalid data format' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // 將新狀態寫入 KV 命名空間
        await STATUS_KV.put(KV_KEY, JSON.stringify(data));
        
        return new Response(JSON.stringify({ success: true, message: 'Status updated' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (e) {
        // console.error('Processing error:', e); // 建議在實際環境中啟用日誌
        return new Response(JSON.stringify({ error: 'Processing error or invalid JSON body' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};

// 處理其他 HTTP 方法 (HEAD, PUT, DELETE, etc.)，返回 405 (Method Not Allowed)
export const onRequest = async (context) => {
    return new Response('Method Not Allowed', { status: 405 });
};
