import type { Response } from "express";

import {
  broadcastStockPrice,
  sendSseHeartbeat,
  sseClients,
} from "../sse/sse-manager";

type MockResponse = Pick<
  Response,
  "write" | "end" | "destroyed" | "writableEnded"
>;

function createMockResponse(overrides?: Partial<MockResponse>): MockResponse {
  return {
    write: jest.fn(),
    end: jest.fn(),
    destroyed: false,
    writableEnded: false,
    ...overrides,
  };
}

describe("sse-manager", () => {
  afterEach(() => {
    sseClients.clear();
    jest.clearAllMocks();
  });

  it("broadcastStockPrice sends SSE payload to all clients", () => {
    const clientOne = createMockResponse();
    const clientTwo = createMockResponse();

    sseClients.add(clientOne as Response);
    sseClients.add(clientTwo as Response);

    const data = {
      symbol: "INFY",
      price: 1440.5,
      previousPrice: 1435.25,
      updatedAt: "2026-04-22T10:00:00.000Z",
    };

    broadcastStockPrice(data);

    const expected = `data: ${JSON.stringify(data)}\n\n`;

    expect(clientOne.write).toHaveBeenCalledWith(expected);
    expect(clientTwo.write).toHaveBeenCalledWith(expected);
  });

  it("removes disconnected clients before broadcasting", () => {
    const disconnected = createMockResponse({ writableEnded: true });
    const active = createMockResponse();

    sseClients.add(disconnected as Response);
    sseClients.add(active as Response);

    broadcastStockPrice({
      symbol: "TCS",
      price: 3600,
      previousPrice: 3598,
      updatedAt: "2026-04-22T10:01:00.000Z",
    });

    expect(sseClients.has(disconnected as Response)).toBe(false);
    expect(sseClients.has(active as Response)).toBe(true);
    expect(active.write).toHaveBeenCalledTimes(1);
  });

  it("sendSseHeartbeat writes comment ping", () => {
    const client = createMockResponse();
    sseClients.add(client as Response);

    sendSseHeartbeat(client as Response);

    expect(client.write).toHaveBeenCalledWith(": ping\n\n");
  });

  it("sendSseHeartbeat removes closed client", () => {
    const client = createMockResponse({ destroyed: true });
    sseClients.add(client as Response);

    sendSseHeartbeat(client as Response);

    expect(sseClients.has(client as Response)).toBe(false);
    expect(client.write).not.toHaveBeenCalled();
  });
});
