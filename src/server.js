import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

start().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
