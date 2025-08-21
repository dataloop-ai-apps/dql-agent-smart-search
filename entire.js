async function run(textInput, itemsQuery) {
    const default_query = {
        filter: { $and: [{ hidden: false }, { type: "file" }] },
    };
    const dataset = await dl.datasets.get();
    try {
        textInput = textInput["Text Box"];
    } catch (e) {
        dl.sendEvent({
            name: "app:toastMessage",
            payload: {
                message: "For CLIP FeatureSet input text is required",
                type: "error",
            },
        });
        return default_query;
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
        return null;
    }

    function logDebug() {
        try {
            console.log("[MCP-DQL]", ...arguments);
        } catch (_) {
            // no-op
        }
    }

    async function generateDqlFromText(text, datasetId) {
        const APP_ID = "68a6db9545c9445779972eb2"; // Use the correct app ID from your headers
        const jwt = getCookie("JWT");
        logDebug("JWT present?", !!jwt, jwt ? `prefix=${jwt.slice(0, 10)}..., len=${jwt.length}` : "");
        
        // Use the direct app URL pattern we saw in the redirect
        const serverUrl = `https://dataloop-mcp-dql-agent-${APP_ID}.apps.dataloop.ai`;
        logDebug("Using MCP serverUrl (direct)", serverUrl);

        const toolUrl = `${serverUrl}/tools/ask_dql_agent`;
        logDebug("Calling MCP tool", toolUrl, { promptLen: (text || "").length, datasetId });
        
        const headers = {
            "Content-Type": "application/json"
        };
        
        // Add JWT if available
        if (jwt) {
            headers["authorization"] = `Bearer ${jwt}`;
        }
        
        const toolResp = await fetch(toolUrl, {
            method: "POST",
            credentials: "include", // This will send all cookies including JWT
            headers: headers,
            body: JSON.stringify({ prompt: text, datasetId }),
        });
        
        let toolPreview = "";
        try {
            toolPreview = (await toolResp.clone().text()).slice(0, 800);
        } catch (_) {}
        
        logDebug("Tool response status", toolResp.status, "preview", toolPreview);
        
        if (!toolResp.ok) {
            throw new Error(`MCP tool call failed (${toolResp.status}). Body: ${toolPreview}`);
        }

        let data;
        try {
            data = await toolResp.json();
        } catch (err) {
            logDebug("Tool JSON parse error", err && err.message, "raw preview", toolPreview);
            throw err;
        }
        
        logDebug("Tool JSON parsed, keys", data ? Object.keys(data) : null);
        return data && data.dql ? data.dql : null;
    }

    function mergeBaseConstraints(mcpDql, datasetId) {
        const baseFilter = {
            $and: [{ hidden: false }, { type: "file" }, { datasetId }],
        };
        const mergedFilter =
            mcpDql && mcpDql.filter
                ? { $and: [baseFilter, mcpDql.filter] }
                : baseFilter;

        return {
            resource: "items",
            page: 0,
            pageSize: 1000,
            ...(mcpDql || {}),
            filter: mergedFilter,
        };
    }

    let mcpDql;
    try {
        mcpDql = await generateDqlFromText(textInput, dataset.id);
    } catch (e) {
        console.error("[MCP-DQL] Error generating DQL:", e && e.message);
        if (e && e.stack) console.error("[MCP-DQL] Stack:", e.stack);
        dl.sendEvent({
            name: "app:toastMessage",
            payload: {
                message: "Failed generating DQL from MCP",
                type: "error",
            },
        });
        return default_query;
    }

    const query = mergeBaseConstraints(mcpDql, dataset.id);
    logDebug("Final merged query", query);
    return query;
}
