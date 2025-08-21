import requests
import dtlpy as dl
token = dl.token()

resp = requests.get("https://gate.dataloop.ai/api/v1/apps/68a6c5271e72fcf0cac19442", headers={'authorization': 'Bearer ' + token})
app_json = resp.json()
dpk_name = app_json['dpkName']
app_route = app_json['routes']['mcp']

session = requests.Session()
response = session.get(app_route, headers={'authorization': 'Bearer ' + token})
app_jwt = session.cookies.get("JWT-APP")
server_url = response.url
mcp_server = {
    "type": "mcp",
    "server_label": dpk_name,
    "server_url": server_url,
    "allowed_tools": ["ask_dql_agent"],
    "require_approval": "never",
    "headers": {
        "Cookie": f"JWT-APP={app_jwt}",
        "x-dl-info": token,
        "x-dl-environment": "https://gate.dataloop.ai/api/v1",
    },
}
