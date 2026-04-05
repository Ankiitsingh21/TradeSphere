import { BadRequestError } from "@showsphere/common";
import { nseClient } from "../utils/nse-client";

export const fetch = async (index: string) => {
  const { data } = await nseClient.get(
    `/equity-stockIndices?index=${encodeURIComponent(index)}`,
  );

  if (!data) {
    throw new BadRequestError("Not able to fetch the api");
  }

  return data;
};
