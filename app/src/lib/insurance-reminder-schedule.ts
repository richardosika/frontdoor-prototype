import { INSURANCE_TIME_ZONE, insuranceDateKey } from "@/lib/insurance-compliance";
import { runInsuranceReminders } from "@/lib/insurance-reminders";

const hourFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: INSURANCE_TIME_ZONE, hour: "2-digit", hourCycle: "h23",
});
let timer: ReturnType<typeof setInterval> | undefined;
let lastRunDay = "";
let running = false;

export function startInsuranceReminderSchedule() {
  if (timer) return;
  async function check() {
    const now = new Date();
    const day = insuranceDateKey(now);
    if (running || day === lastRunDay || Number(hourFormat.format(now)) < 9) return;
    running = true;
    try {
      await runInsuranceReminders({ dryRun: false, now });
      lastRunDay = day;
    } catch (error) {
      console.error("Scheduled insurance reminders failed", error);
    } finally {
      running = false;
    }
  }
  timer = setInterval(() => void check(), 60 * 60 * 1000);
  timer.unref();
  // First check 15 minutes after boot (not at boot), so staff can preview a run from Admin → Insurance after a deploy.
  setTimeout(() => void check(), 15 * 60 * 1000).unref();
}
