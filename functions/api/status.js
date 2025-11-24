// functions/api/status.js

// 綁定名稱和 KV Key - 確保 KV_BINDING_NAME 'STATUS_DATA' 與您的 Cloudflare Pages 設定一致！
const KV_BINDING_NAME = 'STATUS_DATA'; 
const KV_KEY = 'current_server_status';

/**
 * 處理 GET 請求 (讀取伺服器狀態)
 * 這是前端 loadStatus() 函式呼叫 /api/status 時會執行的程式碼。
 * @param {Context} context - 包含 env, request 等資訊
 * @returns {Response}
 */
export const onRequestGet = async (context) => {
    // 從環境變數中取得 KV 綁定
    const STATUS_KV = context.env[KV_BINDING_NAME];
    
    // 檢查 KV 綁定是否缺失 (這是導致 500 錯誤的常見原因之一)
    if (!STATUS_KV) {
        console.error(`KV 綁定 '${KV_BINDING_NAME}' 未找到。請檢查 Cloudflare Pages 設定。`);
        return new Response(JSON.stringify({ 
            status: 'api_error', 
            message: `Functions 內部錯誤：KV 綁定 '${KV_BINDING_NAME}' 缺失。`
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

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
        // 如果 KV 讀取失敗或 JSON 解析失敗
        console.error('KV read or JSON parse failed:', e);
        return new Response(JSON.stringify({ 
            status: 'api_error',
            message: `Functions 內部錯誤：讀取 KV 失敗或資料解析錯誤。`
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};

/**
 * 處理 POST 請求 (更新伺服器狀態)
 * 這是前端 saveStatus() 函式呼叫 /api/status 時會執行的程式碼 (管理員操作)。
 * @param {Context} context - 包含 env, request 等資訊
 * @returns {Response}
 */
export const onRequestPost = async (context) => {
    // 取得 KV 綁定
    const STATUS_KV = context.env[KV_BINDING_NAME];
    
    // 檢查 KV 綁定是否缺失
    if (!STATUS_KV) {
         return new Response(JSON.stringify({ error: `Functions 內部錯誤：KV 綁定 '${KV_BINDING_NAME}' 缺失。` }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        // 嘗試解析請求體
        const data = await context.request.json();
        
        if (!data.status || !data.message) {
            return new Response(JSON.stringify({ error: 'Invalid data format: status or message missing' }), { 
                status: 400, // Bad Request
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
        // 如果 JSON 解析失敗或 KV 寫入失敗
        console.error('Processing error:', e);
        return new Response(JSON.stringify({ error: 'Processing error or invalid JSON body' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};

/**
 * 處理未定義的方法 (如 HEAD, DELETE, PUT)
 * @param {Context} context
 * @returns {Response}
 */
export const onRequest = async (context) => {
    // 這會處理所有非 GET 和 POST 的請求，並返回 405 (Method Not Allowed)
    return new Response('Method Not Allowed', { status: 405 });
};
