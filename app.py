import os
from contextlib import asynccontextmanager
from datetime import datetime

from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route


mcp = FastMCP(
    "simple-name-time-mcp-server",
    json_response=True,
    streamable_http_path="/",
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
        Mount("/mcp", app=mcp.streamable_http_app()),
    ],
    lifespan=lifespan,
)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "3000"))
    uvicorn.run(app, host="0.0.0.0", port=port)