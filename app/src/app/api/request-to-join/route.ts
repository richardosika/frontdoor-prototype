import { postJoinRequest } from "@/lib/join-request-post";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return postJoinRequest(request);
}
