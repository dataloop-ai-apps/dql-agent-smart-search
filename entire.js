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

  function logDebug() {
    try {
      console.log('[MCP-DQL]', ...arguments)
    } catch (_) {
      // no-op
    }
  }

  async function generateDqlFromText(text, datasetId) {
    const APP_ID = '68a6c5271e72fcf0cac19442'
    const jwt = getCookie('JWT')
    logDebug('JWT present?', !!jwt, jwt ? `prefix=${jwt.slice(0, 10)}..., len=${jwt.length}` : '')
    if (!jwt) throw new Error('Missing JWT cookie')

    const appUrl = `https://gate.dataloop.ai/api/v1/apps/${APP_ID}`
    logDebug('Fetching app descriptor', appUrl)
    const appResp = await fetch(appUrl, {
      method: 'GET',
      credentials: 'include',
      headers: { 'authorization': `Bearer ${jwt}` }
    })
    logDebug('App descriptor response status', appResp.status)
    if (!appResp.ok) {
      let bodyText = ''
      try { bodyText = (await appResp.text()).slice(0, 500) } catch (_) {}
      throw new Error(`Failed to get app descriptor (${appResp.status}). Body: ${bodyText}`)
    }
    let appJson
    try {
      appJson = await appResp.json()
    } catch (err) {
      let raw = ''
      try { raw = (await appResp.clone().text()).slice(0, 500) } catch (_) {}
      logDebug('App JSON parse error', err && err.message, 'raw preview', raw)
      throw err
    }
    const appRoute = appJson && appJson.routes && appJson.routes.mcp
    logDebug('Resolved appRoute', appRoute)
    if (!appRoute) throw new Error('Missing MCP route')

    logDebug('Opening MCP route to establish JWT-APP', appRoute)
    const routeResp = await fetch(appRoute, {
      method: 'GET',
      credentials: 'include',
      redirect: 'follow',
      headers: { 'authorization': `Bearer ${jwt}` }
    })
    logDebug('MCP route response status', routeResp.status, 'final URL', routeResp.url)
    if (!routeResp.ok) {
      let bodyText = ''
      try { bodyText = (await routeResp.text()).slice(0, 500) } catch (_) {}
      throw new Error(`Failed to open MCP route (${routeResp.status}). Body: ${bodyText}`)
    }
    const serverUrl = routeResp.url
    logDebug('Using MCP serverUrl', serverUrl)

    const toolUrl = `${serverUrl}/tools/ask_dql_agent`
    logDebug('Calling MCP tool', toolUrl, { promptLen: (text || '').length, datasetId })
    const toolResp = await fetch(toolUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, datasetId })
    })
    let toolPreview = ''
    try { toolPreview = (await toolResp.clone().text()).slice(0, 800) } catch (_) {}
    logDebug('Tool response status', toolResp.status, 'preview', toolPreview)
    if (!toolResp.ok) throw new Error(`MCP tool call failed (${toolResp.status}). Body: ${toolPreview}`)

    let data
    try {
      data = await toolResp.json()
    } catch (err) {
      logDebug('Tool JSON parse error', err && err.message, 'raw preview', toolPreview)
      throw err
    }
    logDebug('Tool JSON parsed, keys', data ? Object.keys(data) : null)
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
    console.error('[MCP-DQL] Error generating DQL:', e && e.message)
    if (e && e.stack) console.error('[MCP-DQL] Stack:', e.stack)
    dl.sendEvent({
      name: "app:toastMessage",
      payload: { message: "Failed generating DQL from MCP", type: "error" }
    })
    return default_query
  }

  const query = mergeBaseConstraints(mcpDql, dataset.id)
  logDebug('Final merged query', query)
  return query
}
