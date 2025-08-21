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
        // Adjust functionName/serviceName as needed for your deployment
        try {
            const execution = await dl.executions.create({
                functionName: 'ask_dql_agent',
                serviceName: 'dataloop-mcp-dql-agent',
                input: { query: text, dataset_id: datasetId }
            })

            if (execution && typeof execution.wait === 'function') {
                await execution.wait()
            }

            const output = execution && execution.output ? execution.output : {}
            logDebug('Execution output keys', output ? Object.keys(output) : null)
            return output.dql || (output.data && output.data.dql) || null
        } catch (e) {
            logDebug('Execution error', e && e.message)
            throw e
        }
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
