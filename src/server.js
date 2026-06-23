import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { randomUUID } from "node:crypto";
import {
  CallToolRequestSchema,
  isInitializeRequest,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const TIME_TOOL_NAME = "get_current_time_for_name";
const LUCKY_NUMBER_TOOL_NAME = "get_lucky_number";

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDateTime(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const server = new Server(
  {
    name: "simple-name-time-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const app = express();
app.use(express.json());

const transports = {};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: TIME_TOOL_NAME,
        description: "Say a name and return the current local time in a simple message.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Person name to include in the response.",
              minLength: 1,
            },
          },
          required: ["name"],
          additionalProperties: false,
        },
      },
      {
        name: LUCKY_NUMBER_TOOL_NAME,
        description: "Return the lucky number. This always returns 44.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === LUCKY_NUMBER_TOOL_NAME) {
    return {
      content: [
        {
          type: "text",
          text: "Your lucky number is 44.",
        },
      ],
    };
  }

  if (request.params.name !== TIME_TOOL_NAME) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Unknown tool: ${request.params.name}`,
        },
      ],
    };
  }

  const args = request.params.arguments ?? {};
  const name = typeof args.name === "string" ? args.name.trim() : "";

  if (!name) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "The 'name' field is required.",
        },
      ],
    };
  }

  const now = new Date();
  const formattedTime = formatLocalDateTime(now);
  const message = `Hello ${name}, current time is ${formattedTime}.`;

  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
  };
});

async function start() {
  const port = Number(process.env.PORT || 3000);
  const host = "0.0.0.0";

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  const handleMcpRequest = async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];

    try {
      let transport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (newSessionId) => {
            transports[newSessionId] = transport;
          },
        });

        transport.onclose = () => {
          const closedSessionId = transport.sessionId;
          if (closedSessionId && transports[closedSessionId]) {
            delete transports[closedSessionId];
          }
        };

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  };

  app.post("/mcp", handleMcpRequest);
  app.get("/mcp", handleMcpRequest);
  app.delete("/mcp", handleMcpRequest);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.listen(port, host, () => {
    console.log(`MCP HTTP server listening on ${host}:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
