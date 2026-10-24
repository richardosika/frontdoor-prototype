import { ConversationList } from "@/components/conversation-list";
import { requireUser } from "@/lib/current-user";
import { listConversations } from "@/lib/conversations";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await requireUser();
  const conversations = await listConversations(user.id);
  return (
    <div className="mx-auto max-w-3xl lg:grid lg:max-w-none lg:grid-cols-[340px_minmax(0,1fr)]">
      <ConversationList conversations={conversations} activeId={null} />
      <div className="hidden items-center justify-center text-sm text-mut lg:flex">Select a conversation.</div>
    </div>
  );
}
