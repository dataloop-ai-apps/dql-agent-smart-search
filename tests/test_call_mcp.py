import requests
import json
import uuid
import dtlpy as dl

class MCPClient:
    def __init__(self, server_url):
        self.server_url = server_url
        self.session = requests.Session()
    
    def _make_request(self, method, params=None):
        """Make a JSON-RPC 2.0 request to the MCP server"""
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": method,
        }
        if params:
            payload["params"] = params
            
        response = self.session.post(
            self.server_url,
            json=payload,
            headers={"Content-Type": "application/json",
                     "Cookie": "JWT-APP=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTU3OTE4NjksImRhdGEiOiJhYjI1NDE1ODE2ZTA4ZDEzMjNlODkwZjc4OTE3M2E3ZWE5ZTc3MTA4ZGFhNjBhMDZjMGYzN2EyY2E3NmNmZDkxNjcxOGU1NDUzOGIwNDNkNTk3NjE2ZmNjNDg0ZTRiYzgzNDViY2E2YzgwM2JmMTQ4MmJlNWU4NTY1ZWI5NWU0ZmQ3ZDE3YTUyNjBmZTg2NzM0OTU1ODY2ODM4MzE5ODY4MTI2ZDRlZDVjMGU4MDgyYjc3MzNmMjhjNzc4M2I5Njg2ZjEyN2YyZjk0NWE0MzEwOWQyNmFkNjBmMzE0ZjI4MTYwM2Y0NWJhNDE3MjQxODY5MjNlMGE2M2RiNTQ5OTllZWFjYzQwMDg3YmE5ZGZlNzlkN2MyZjhhZmVkYzBmNDc4NDYyMTU5ZjUzMmM3MmNkNGNjYjM1NjM4MDBjNmJiMTQyYzUzN2YwMzE2ZjMwOTY5ZmVkMzFiMWQyZjI1MWUwMTNkOWQ5NzkyYmZiN2RlMGMwMjdmMjE2MDYxMTRhMDMiLCJpc3MiOiJodHRwczovL2dhdGUuZGF0YWxvb3AuYWkiLCJpYXQiOjE3NTU3Nzc0Njl9.hdGV2-o_MJfSYtYf5bKRycprBz_7XzV9rGRi3z7HqfXihUzADzU8m8L_hNs0nNkor7r-yJwVC8e1hBgRXF_8z6DwMemL5ARVLUa8ZiNttozPGk_rFn2kDyrYcQ2qlT-fMOh1ESIylVmETh_aNuJzjvDgvOUIG-ozqOcq7Ax0BZW9obVVa7cGkGzpdy7CRU4bOdMguChw_0G6tfAxIceewG6yh1bleOFKpvqvGLJzjl0T3lrPH9oEbvFw7FxvfQ2z0RiX64BZyTncWW905Oi8yL6nlqVdDKOmU8G1QsCKOIYO6qwdpAqzB4W-MdsLN5jF7EE3EeYcrStnHjNQMGBMfMtTNLIKhwH_w7SxsAdfDwaBfcJbdS4sSCi6OMGqxiLxdEHMf-AUpU-EnjqHNkPoblCm3dGH1R9drj8BZsUgF6AKTI1qCM0jZIGx5VU5b8TYh2stibsappOpbBX03i4vQYQpuJ2k-_zsRxOqvR8NMPpJ1T0oLdhWhnIDmGKQZ3xvUnTi7risV70pQJPp60dZ0Z6_lYHpIVywUZ1ZnKFbNEbdGJxduBjAVMhlx3LR6lo3BNrY6sxPlqJPVvamWqR6cBmr80G4isCxNOCdAmRfjBMmrYJ7gI0_REt37GklgDNJennLej2JVLOyDvSDAdti7_kMCeSurHlv5ydK35Kd914",
                     "authorization": "Bearer " + dl.token()}
        )
        response.raise_for_status()
        
        result = response.json()
        if "error" in result:
            raise Exception(f"MCP Error: {result['error']}")
        
        return result.get("result")
    
    def initialize(self, client_info=None):
        """Initialize the MCP session"""
        params = {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            }
        }
        if client_info:
            params["clientInfo"] = client_info
        
        return self._make_request("initialize", params)
    
    def list_tools(self):
        """Get available tools from the server"""
        return self._make_request("tools/list")
    
    def call_tool(self, tool_name, arguments=None):
        """Call a specific tool"""
        params = {
            "name": tool_name
        }
        if arguments:
            params["arguments"] = arguments
            
        return self._make_request("tools/call", params)
    
    def list_resources(self):
        """List available resources"""
        return self._make_request("resources/list")
    
    def read_resource(self, uri):
        """Read a specific resource"""
        return self._make_request("resources/read", {"uri": uri})

# Example usage
def main():
    # Replace with your MCP server URL
    server_url = "https://dataloop-mcp-dql-agent-68a6c5271e72fcf0cac19442.apps.dataloop.ai/mcp"  # or whatever your server uses
    
    client = MCPClient(server_url)
    
    try:
        # Initialize the connection
        init_result = client.initialize({
            "name": "direct-client",
            "version": "1.0.0"
        })
        print("Initialized:", init_result)
        
        # List available tools
        tools = client.list_tools()
        print("Available tools:")
        for tool in tools.get("tools", []):
            print(f"  - {tool['name']}: {tool.get('description', 'No description')}")
        
        # Call a specific tool (example)
        if tools.get("tools"):
            tool_name = tools["tools"][0]["name"]  # Use first available tool
            result = client.call_tool(tool_name, {"example": "parameter"})
            print(f"Tool '{tool_name}' result:", result)
    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()