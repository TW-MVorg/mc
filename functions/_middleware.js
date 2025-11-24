// functions/_middleware.js
const STATUS_KV_KEY = 'SERVER_STATUS';
const STATUS_API_ROUTE = '/api/status';

// --- 內嵌 HTML 介面 (公開顯示狀態 + 受保護的管理按鈕) ---
const getHtml = (status) => `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MC 狀態 (Zero Trust 保護)</title>
    <style>
        body { font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; }
        .container { max-width: 450px; margin: 0 auto; background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .status-box { padding: 25px; border-radius: 8px; margin-bottom: 25px; color: white; display: inline-block; }
        .ONLINE { background-color: #4CAF50; }
        .OFFLINE { background-color: #f44336; }
        .UNKNOWN { background-color: #ff9800; }
        #current-status { font-size: 2.5em; font-weight: bold; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; border: none; border-radius: 5px; font-weight: bold; transition: background-color 0.3s; }
        .status-btn-online { background-color: #4CAF50; color: white; }
        .status-btn-offline { background-color: #f44336; color: white; }
        .admin-section { margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
        .admin-section button { font-size: 1.1em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>MC 伺服器狀態</h1>
        <div class="status-box ${status}" id="status-display">
            目前狀態: <span id="current-status">${status}</span>
        </div>

        <div id="admin-section" class="admin-section">
            <h3>管理員操作區</h3>
            <p>點擊下方按鈕修改狀態，<span style="color:red; font-weight: bold;">如果未登入會自動導向 Cloudflare 驗證頁面。</span></p>
            <button onclick="updateStatus('ONLINE')" class="status-btn-online">✅ 正常運行 (ONLINE)</button>
            <button onclick="updateStatus('OFFLINE')" class="status-btn-offline">❌ 無法連線 (OFFLINE)</button>
            <p id="admin-message" style="margin-top: 15px; color: green;"></p>
        </div>
    </div>

    <script>
        const API_URL = '${STATUS_API_ROUTE}';
        const statusText = document.getElementById('current-status');
        const statusBox = document.getElementById('status-display');
        const adminMessage = document.getElementById('admin-message');

        async function updateStatus(newStatus) {
            adminMessage.textContent = '正在發送請求並驗證...';
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                if (response.ok) {
                    adminMessage.textContent = \`狀態已更新為 \${newStatus}！\`;
                    statusText.textContent = newStatus;
                    statusBox.className = 'status-box ' + newStatus;
                } else if (response.status === 403 || response.status === 401) {
                    adminMessage.textContent = '權限不足或未登入。您將被導向 Cloudflare 驗證...';
                    // 讓瀏覽器重新載入，以便 Cloudflare Access 攔截並導向登入頁面
                    window.location.reload(); 
                } else {
                    const error = await response.text();
                    adminMessage.textContent = \`更新失敗: \${error}\`;
                }
            } catch (e) {
                adminMessage.textContent = '網路錯誤，請檢查連線。';
            }
        }
        window.updateStatus = updateStatus;
    </script>
</body>
</html>
`;

/**
 * Pages Functions 主處理程序：處理 KV 讀寫
 */
export const onRequest = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);

    // --- 路由 1: 狀態修改 API (POST 請求) ---
    if (url.pathname === STATUS_API_ROUTE && request.method === 'POST') {
        // 如果請求通過了 Cloudflare Access（步驟 5 設定的），則執行 KV 寫入。
        try {
            const { status } = await request.json();
            if (status === 'ONLINE' || status === 'OFFLINE') {
                await env.STATUS_DATA.put(STATUS_KV_KEY, status);
                return new Response(`狀態已設定為 ${status}`, { status: 200 });
            }
            return new Response('無效的狀態值', { status: 400 });
        } catch (e) {
            return new Response(`處理錯誤: ${e.message}`, { status: 500 });
        }
    }

    // --- 路由 2: 預設首頁 (GET 請求) ---
    if (url.pathname === '/') {
        // 讀取 KV 狀態
        let status = await env.STATUS_DATA.get(STATUS_KV_KEY) || 'UNKNOWN';
        return new Response(getHtml(status), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return context.next(); 
};
