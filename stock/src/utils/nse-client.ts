import axios from "axios";

export const nseClient = axios.create({
  baseURL: "https://www.nseindia.com/api",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/118.0",
    Accept: "*/*",
    Referer: "https://www.nseindia.com",
    "Accept-Language": "en-US,en;q=0.5",
  },
  timeout: 15000,
});
