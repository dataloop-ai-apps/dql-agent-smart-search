async function run(textInput, itemsQuery) {
  const default_query = { filter: { $and: [{ hidden: false }, { type: 'file' }] } }
  const dataset = await dl.datasets.get()
  try {
    textInput = textInput['Text Box']
  }
  catch (e) {
    dl.sendEvent({
      name: "app:toastMessage",
      payload: {
        message: "For CLIP FeatureSet input text is required",
        type: "error"
      }
    })
    return default_query
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
    return null
  }

  async function generateDqlFromText(text, datasetId) {
    const APP_ID = '68a6c5271e72fcf0cac19442'
    const jwt = getCookie('JWT')
    if (!jwt) throw new Error('Missing JWT cookie')

    const appResp = await fetch(`https://gate.dataloop.ai/api/v1/apps/${APP_ID}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'authorization': `Bearer ${jwt}` }
    })
    if (!appResp.ok) throw new Error('Failed to get app descriptor')
    const appJson = await appResp.json()
    const appRoute = appJson && appJson.routes && appJson.routes.mcp
    if (!appRoute) throw new Error('Missing MCP route')

    const routeResp = await fetch(appRoute, {
      method: 'GET',
      credentials: 'include',
      redirect: 'follow',
      headers: { 'authorization': `Bearer ${jwt}` }
    })
    if (!routeResp.ok) throw new Error('Failed to open MCP route')
    const serverUrl = routeResp.url

    const toolResp = await fetch(`${serverUrl}/tools/ask_dql_agent`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, datasetId })
    })
    if (!toolResp.ok) throw new Error('MCP tool call failed')

    const data = await toolResp.json()
    return data && data.dql ? data.dql : null
  }

  function mergeBaseConstraints(mcpDql, datasetId) {
    const baseFilter = { $and: [{ hidden: false }, { type: 'file' }, { datasetId }] }
    const mergedFilter = mcpDql && mcpDql.filter ? { $and: [baseFilter, mcpDql.filter] } : baseFilter

    return {
      resource: 'items',
      page: 0,
      pageSize: 1000,
      ...(mcpDql || {}),
      filter: mergedFilter
    }
  }

  let mcpDql
  try {
    mcpDql = await generateDqlFromText(textInput, dataset.id)
  } catch (e) {
    console.log(e)
    dl.sendEvent({
      name: "app:toastMessage",
      payload: { message: "Failed generating DQL from MCP", type: "error" }
    })
    return default_query
  }

  const query = mergeBaseConstraints(mcpDql, dataset.id)
  console.log(query)
  return query
}
