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
        // Create an execution of a backend function that returns a DQL object for the prompt
        try {
            const execution = await dl.executions.create({
                functionName: 'ask_dql_agent',
                serviceName: 'dataloop-mcp-dql-agent',
                input: { query: text, dataset_id: datasetId }
            })

            const execId = execution && (execution.id || execution._id)
            if (!execId) throw new Error('Missing execution id')

            async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
            const jwt = getCookie('JWT')
            const headers = jwt ? { authorization: `Bearer ${jwt}` } : {}
            const gateBase = 'https://gate.dataloop.ai/api/v1'
            const execUrl = `${gateBase}/executions/${execId}`
            logDebug('Polling execution', execId, execUrl)

            const successStatuses = new Set(['completed', 'success'])
            const failureStatuses = new Set(['failed', 'error', 'aborted', 'stopped'])
            const start = Date.now()
            let lastStatus = execution.latestStatus
            while (true) {
                if (Date.now() - start > 120000) {
                    throw new Error(`Execution timed out after 120s (last status: ${lastStatus || 'unknown'})`)
                }
                let resp, preview = ''
                try {
                    resp = await fetch(execUrl, { method: 'GET', credentials: 'include', headers })
                    try { preview = (await resp.clone().text()).slice(0, 500) } catch (_) {}
                    if (!resp.ok) throw new Error(`GET ${execUrl} -> ${resp.status} ${preview}`)
                    const data = await resp.json()
                    lastStatus = data && data.latestStatus
                    logDebug('Execution status', lastStatus)
                    if (lastStatus.status && successStatuses.has(lastStatus.status)) {
                        const output = lastStatus && lastStatus.output ? lastStatus.output : {}
                        logDebug('Execution output keys', output ? Object.keys(output) : null)
                        return output.dql_query || null
                    }
                    if (lastStatus.status && failureStatuses.has(lastStatus.status)) {
                        throw new Error(`Execution failed with status: ${lastStatus.status}`)
                    }
                } catch (err) {
                    logDebug('Poll error', err && err.message)
                    // continue polling on transient errors within timeout
                }
                await sleep(1500)
            }
        } catch (e) {
            logDebug('Execution error', e && e.message)
            throw e
        }
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

    // If execution returned output, return minimal items query with provided filter and optional join
    if (mcpDql) {
        const filter = mcpDql && mcpDql.filter ? mcpDql.filter : mcpDql;
        const query = {
            filter,
            page: 0,
            pageSize: 1000,
            resource: "items",
        };
        if (mcpDql && mcpDql.join) {
            query.join = mcpDql.join;
        }
        logDebug("Using execution output (filter/join)", query);
        return query;
    }

    // Fallback if no output was returned
    logDebug("No execution output. Returning default query");
    return default_query;
}
