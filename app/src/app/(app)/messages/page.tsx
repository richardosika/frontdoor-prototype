import Link from "next/link";
import { serverTx } from "@/lib/i18n/server";
import { ConversationList } from "@/components/conversation-list";
import { btn, btnOutline } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { listConversations } from "@/lib/conversations";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const tx = await serverTx();
  const user = await requireUser();
  const conversations = await listConversations(user.id);
  if (conversations.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <section className="w-full rounded border border-line bg-paper p-6 text-center sm:p-10" data-testid="messages-empty">
          <h1 className="font-serif text-[28px] text-forest sm:text-[34px]">{tx("No conversations yet")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-[17px] leading-relaxed text-ink">
            {tx("Conversations open when a member accepts your contact about a project, or when you are in each other's circle.")}
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-[16px] leading-relaxed text-mut">
            {tx("Add an approved project so the right members can reach you, contact members whose projects seek your category, or grow your circle.")}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/profile#add-project" className={btn}>
              {tx("Add a project")}
            </Link>
            <Link href="/feed#ledger-seeking" className={btnOutline}>
              {tx("Projects seeking your category")}
            </Link>
            <Link href="/network" className={btnOutline}>
              {tx("My Circle")}
            </Link>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl lg:grid lg:max-w-none lg:grid-cols-[340px_minmax(0,1fr)]">
      <ConversationList conversations={conversations} activeId={null} />
      <div className="hidden items-center justify-center text-sm text-mut lg:flex">{tx("Select a conversation.")}</div>
    </div>
  );
}
