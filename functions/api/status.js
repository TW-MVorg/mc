// functions/api/status.js

// 綁定名稱和 KV Key
const KV_BINDING_NAME = 'STATUS_DATA'; 
const KV_KEY = 'current_server_status';

/**
 * 處理 GET 請求 (讀取伺服器狀態)
 * @param {Context} context - 包含 env, request 等資訊
 * @returns {Response}
 */
export const onRequestGet = async (context) => {
    // 從環境變數中取得 KV 綁定
    const STATUS_KV = context.env[KV_BINDING_NAME];
    
    try {
        const statusJson = await STATUS_KV.get(KV_KEY);
        
        let statusData;
        if (statusJson) {
            statusData = JSON.parse(statusJson);
        } else {
            // 預設狀態 (如果 KV 是空的)
            statusData = { status: 'unknown', message: 'KV 尚未寫入狀態，請管理員首次更新。' };
        }
        
        return new Response(JSON.stringify(statusData), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                // 為了防止瀏覽器過度緩存 API 結果 (可選)
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });

    } catch (e) {
        // 如果 KV 讀取失敗 (例如綁定錯誤)，返回 500
        console.error('KV read failed:', e);
        return new Response(JSON.stringify({ error: 'KV read failed', details: e.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};

/**
 * 處理 POST 請求 (更新伺服器狀態)
 * @param {Context} context - 包含 env, request 等資訊
 * @returns {Response}
 */
export const onRequestPost = async (context) => {
    // 取得 KV 綁定
    const STATUS_KV = context.env[KV_BINDING_NAME];
    
    // 由於前端程式碼的設計，POST 請求主要用於管理員更新，
    // 這裡依賴 Pages Functions 外部的 Cloudflare Access/Zero Trust 進行授權檢查。
    // 您不需要在程式碼中重複檢查權限。

    try {
        // 嘗試解析請求體
        const data = await context.request.json();
        
        if (!data.status || !data.message) {
            return new Response(JSON.stringify({ error: 'Invalid data format: status or message missing' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // 將新狀態寫入 KV 命名空間 (永久保存)
        await STATUS_KV.put(KV_KEY, JSON.stringify(data));
        
        return new Response(JSON.stringify({ success: true, message: 'Status updated' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (e) {
        // 如果 JSON 解析失敗或 KV 寫入失敗
        console.error('Processing error:', e);
        return new Response(JSON.stringify({ error: 'Processing error or invalid JSON body', details: e.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};

/**
 * 處理未定義的方法 (如 HEAD, DELETE, PUT)
 */
export const onRequest = async (context) => {
    return new Response('Method Not Allowed', { status: 405 });
};
