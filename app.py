import os
from contextlib import asynccontextmanager
from datetime import datetime
from urllib.parse import urlparse

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route


def build_transport_security() -> TransportSecuritySettings:
    allowed_hosts = [
        "127.0.0.1:*",
        "localhost:*",
        "[::1]:*",
    ]
    allowed_origins = [
        "http://127.0.0.1:*",
        "http://localhost:*",
        "http://[::1]:*",
    ]

    render_host = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
    render_url = os.environ.get("RENDER_EXTERNAL_URL")

    if not render_host and render_url:
        render_host = urlparse(render_url).hostname

    if render_host:
        allowed_hosts.append(render_host)
        allowed_origins.append(f"https://{render_host}")
        allowed_origins.append(f"http://{render_host}")

    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=allowed_hosts,
        allowed_origins=allowed_origins,
    )


mcp = FastMCP(
    "simple-name-time-mcp-server",
    json_response=True,
    streamable_http_path="/mcp",
    transport_security=build_transport_security(),
)


@mcp.tool()
def get_current_time_for_name(name: str) -> str:
    """Return the current local time for the provided name."""
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"Hello {name}, current time is {current_time}."


@mcp.tool()
def get_lucky_number() -> str:
    """Always return the lucky number 44."""
    return "Your lucky number is 44."


def health(_request):
    return JSONResponse({"status": "ok"})


@asynccontextmanager
async def lifespan(_app):
    async with mcp.session_manager.run():
        yield


app = Starlette(
    routes=[
        Route("/health", health),
        Mount("/", app=mcp.streamable_http_app()),
    ],
    lifespan=lifespan,
)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "3000"))
    uvicorn.run(app, host="0.0.0.0", port=port)