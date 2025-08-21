# Smart Search (MCP-powered DQL)

This application enables text-based search for items in a dataset by generating a DQL (Dataloop Query Language) filter from natural language input.
The app now delegates query generation to a backend function and returns a production-ready DQL query object for the platform to execute.

## How it works

- The UI script (`entire.js`) reads the user's prompt, creates an execution of a backend function (`ask_dql_agent` on service `dataloop-mcp-dql-agent`) and polls for completion via `GET /executions/<id>`.
- When the execution completes successfully, the function returns a JSON payload with a `dql_query` field.
- The app converts that to a final query structure and returns it to the platform.

Returned query shape when output exists:

```json
{
  "filter": { /* copied from function output */ },
  "page": 0,
  "pageSize": 1000,
  "resource": "items",
  "join": { /* optional, copied from function output if present */ }
}
```

If the function returns no output, the app falls back to a minimal default query: `{ filter: { $and: [{ hidden: false }, { type: 'file' }] } }`.

## Usage

### App installation:

There are multiple ways to install the AI DQL Agent:

1. **From the Market Place**:
    - Go to the MarketPlace
    - Search for the AI DQL Agent
    - Click on the application and click install button on the right hand side


2. **From the Dataset browser**:
    - Go to the dataset browser
    - Click on the `Add Filters` button.
    - Find the `AI DQL Agent` application in the dropdown menu.
    - Click on Install App button.

### Searching

1. In the dataset browser, click `Add Filters` and add this app's search bar.
2. Enter a natural language prompt and click Search.
3. The backend function will generate a DQL filter (and `join` when relevant) and the app will return a final `items` query as above.

Notes:
- The app uses the browser cookie `JWT` to authorize polling the execution status.
- Success statuses: `completed` or `success`. Failure statuses: `failed`, `error`, `aborted`, `stopped`.

## Contributions, Bugs and Issues - How to Contribute

We welcome anyone to help us improve this app.
Here's a detailed instructions to help you open a bug or ask for a feature request

