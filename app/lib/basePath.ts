export const BASE_PATH = "/gpacalculator";

export const asset = (path: string) =>
  `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
