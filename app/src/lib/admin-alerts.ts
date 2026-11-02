import { noticeTestRecipient } from "@/lib/brand";
import { notifyAdmins } from "@/lib/notify";
import { sendNotice } from "@/lib/notices";

const trimBase = (base: string) => base.replace(/\/+$/, "");

/** Admin email + in-app alert content for a new /join application. */
export function newApplicationAdminNotice(input: {
  base: string;
  applicationId: string;
  name: string;
  role: string;
  company: string;
  email: string;
  location?: string;
  phone?: string;
  website?: string;
  referralCode?: string;
}) {
  const subject = `New application: ${input.name} · ${input.role} · ${input.company}`;
  const link = `${trimBase(input.base)}/admin/applications/${input.applicationId}`;
  const lines = [
    `A new application was submitted.`,
    ``,
    `Name: ${input.name}`,
    `Role: ${input.role}`,
    `Company: ${input.company}`,
    `Email: ${input.email}`,
    input.location ? `Location: ${input.location}` : "",
    input.phone ? `Phone: ${input.phone}` : "",
    input.website ? `Website: ${input.website}` : "",
    input.referralCode ? `Referral code: ${input.referralCode}` : "",
    ``,
    `Open the application: ${link}`,
  ].filter((line, i, all) => line !== "" || (all[i - 1] ?? "") !== "");
  return {
    subject,
    text: lines.join("\n"),
    alert: {
      title: subject,
      body: `${input.name} (${input.email}) applied as ${input.role} at ${input.company}.`,
      href: `/admin/applications/${input.applicationId}`,
    },
  };
}

/** Admin email + in-app alert content for a recorded dues payment. */
export function paymentReceivedAdminNotice(input: {
  base: string;
  userId: string;
  name: string;
  email: string;
  amount: string; // formatted, e.g. "$250" or "$250.00"
  role: string;
  mode: string;
  first: boolean;
}) {
  const amount = input.amount.startsWith("$") ? input.amount : `$${input.amount}`;
  const subject = `Payment received: ${input.name} · ${amount}`;
  const link = `${trimBase(input.base)}/admin/members/${input.userId}`;
  const how =
    input.mode === "stripe" ? "Stripe" : input.mode === "manual" ? "Marked paid by an administrator" : "Simulated test payment";
  const text = [
    `A dues payment was recorded.`,
    ``,
    `Member: ${input.name}`,
    `Email: ${input.email}`,
    `Role: ${input.role}`,
    `Amount: ${amount}`,
    `Payment: ${input.first ? "First month" : "Renewal"} · ${how}`,
    ``,
    `Open the member: ${link}`,
  ].join("\n");
  return {
    subject,
    text,
    alert: { title: subject, body: `${input.name} paid ${amount} (${how}).`, href: `/admin/members/${input.userId}` },
  };
}

/** Sends the admin email (Outbox + copy to NOTICE_TEST_RECIPIENT) and the in-app alert to active admins. Never throws. */
export async function deliverAdminNotice(
  notice: { subject: string; text: string; alert: { title: string; body: string; href: string } },
  meta: { templateKey: string; applicationId?: string | null },
) {
  try {
    await notifyAdmins({ ...notice.alert, body: notice.alert.body.slice(0, 600) });
  } catch (error) {
    console.error("Admin alert failed", error);
  }
  try {
    await sendNotice({
      intendedTo: noticeTestRecipient(),
      applicationId: meta.applicationId ?? null,
      subject: notice.subject,
      text: notice.text,
      templateKey: meta.templateKey,
    });
  } catch (error) {
    console.error("Admin email failed", error);
  }
}

/** Admin email + in-app alert content for a new member vendor suggestion. */
export function vendorSuggestionAdminNotice(input: {
  base: string;
  suggestionId: string;
  memberName: string;
  vendor: string;
  company: string;
  category: string;
  location: string;
  relation: string;
  nameOk: boolean;
  website?: string;
  contact?: string;
  note?: string;
}) {
  const who = input.vendor || input.company || "No specific vendor";
  const subject = `New vendor suggestion: ${who} · ${input.category} · ${input.location}`;
  const link = `${trimBase(input.base)}/admin/vendor-suggestions`;
  const text = [
    `A member suggested a vendor.`,
    ``,
    `Suggested by: ${input.memberName}`,
    `Vendor: ${input.vendor || "—"}`,
    `Company: ${input.company || "—"}`,
    `Category: ${input.category}`,
    `Location: ${input.location}`,
    input.website ? `Website: ${input.website}` : "",
    input.contact ? `Contact: ${input.contact}` : "",
    `How they know them: ${input.relation}`,
    `OK to mention the member's name: ${input.nameOk ? "Yes" : "No"}`,
    input.note ? `Note: ${input.note}` : "",
    ``,
    `Open the queue: ${link}`,
  ]
    .filter((line, i, all) => line !== "" || (all[i - 1] ?? "") !== "")
    .join("\n");
  return {
    subject,
    text,
    alert: { title: subject, body: `${input.memberName} suggested ${who} (${input.category}, ${input.location}).`, href: `/admin/vendor-suggestions` },
  };
}
