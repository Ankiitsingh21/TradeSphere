import { PrismaClient } from "../../src/generated/prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});