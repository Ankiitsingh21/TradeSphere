import { PrismaClient } from "../generated/prisma/client";
import { mockDeep, mockReset } from "jest-mock-extended";

export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});