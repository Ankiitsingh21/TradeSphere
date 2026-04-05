import { nseClient } from "../utils/nse-client";

export const seed = async (index: string) => {
  const { data } = await nseClient.get(
    `/equity-stockIndices?index=${encodeURIComponent(index)}`,
  );
  console.log(data);
  return {};
};
