export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Console email adapter. Messages are written to the server log so the
 * confirmation and application flows work without an email provider.
 */
export async function sendEmail(message: EmailMessage): Promise<{ delivered: "console" }> {
  console.log("\n----- FrontDoor email (console adapter) -----");
  console.log(`To: ${message.to}`);
  console.log(`Subject: ${message.subject}`);
  console.log(message.text);
  console.log("---------------------------------------------\n");
  return { delivered: "console" };
}
