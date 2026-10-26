import { headers } from "next/headers";
import { publicOrigin } from "@/lib/public-origin";

export { isBindHost, publicAbsoluteUrl, publicOrigin, resolvePublicBase } from "@/lib/public-origin";

export async function appBaseUrl(): Promise<string> {
  const headerList = await headers();
  return publicOrigin(headerList);
}
