# Simple Name Time MCP Server

A minimal MCP server for Teams agent usage.

## What it does

- Accepts a single input: `name`
- Returns a simple message with the current local server time
- Returns a lucky number message that always gives `44`

Example response format:

`Hello Alex, current time is 2026-06-23 14:35:10.`

## Setup

1. Install dependencies:
   `npm install`
2. Start the server:
   `npm start`

## Tool exposed

- Tool name: `get_current_time_for_name`
- Input schema:
  - `name` (string, required)
- Tool name: `get_lucky_number`
- Input schema:
   - No input required

## Notes

- Uses no internal or company APIs.
- Uses local machine/server time where the MCP server runs.
