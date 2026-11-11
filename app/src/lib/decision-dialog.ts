import { DECISION_QUEUE_KEY, STEP_SAVE_KEY } from "@/lib/decision-queue";

export const DECISION_MEMORY_KEY = "pf-decision";
export const DECISION_ACK_KEY = "pf-decision-ack";
export const DECISION_DIALOG_ID = "pf-decision-dialog";

/**
 * Close the confirm dialog only after a real decision notice.
 * A request-only approval says the referral code was issued. An application says Approved.
 * A step save ("Checklist saved") must not close it.
 */
export function approvalNoticeClosesDialog(notice: string | null | undefined): boolean {
  const text = notice || "";
  return /approved|declined|asked for more info|referral code issued|this file is verified/i.test(text);
}

export type DecisionDialogSnapshot = {
  approveBody: string;
  declineBody: string;
  showAck: boolean;
  markNotLegit: boolean;
  applicationId: string;
  caseId: string;
};

const INITIAL_SNAPSHOT: DecisionDialogSnapshot = {
  approveBody: "Approve this person?",
  declineBody: "Decline this application? A short notice goes out. The applicant does not see your reason.",
  showAck: false,
  markNotLegit: false,
  applicationId: "",
  caseId: "",
};

let snapshot: DecisionDialogSnapshot = INITIAL_SNAPSHOT;
const listeners = new Set<() => void>();

export function getDecisionDialogSnapshot(): DecisionDialogSnapshot {
  return snapshot;
}

export function getDecisionDialogServerSnapshot(): DecisionDialogSnapshot {
  return INITIAL_SNAPSHOT;
}

/** The open dialog reads this. Publishing the same text does not re-render it. */
export function publishDecisionDialog(next: DecisionDialogSnapshot) {
  if (
    snapshot.approveBody === next.approveBody &&
    snapshot.declineBody === next.declineBody &&
    snapshot.showAck === next.showAck &&
    snapshot.markNotLegit === next.markNotLegit &&
    snapshot.applicationId === next.applicationId &&
    snapshot.caseId === next.caseId
  ) {
    return;
  }
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function subscribeDecisionDialog(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Runs from the server HTML, before React hydrates.
 * The dialog stays where React rendered it. Moving the node onto document.body
 * made the success redirect throw removeChild.
 * A close while the admin still has the dialog open reopens that same node.
 * A close marked data-decision-closing stays closed so the next page can unmount it.
 */
export function decisionDialogBootstrap(): string {
  const key = JSON.stringify(DECISION_MEMORY_KEY);
  const ack = JSON.stringify(DECISION_ACK_KEY);
  const id = JSON.stringify(DECISION_DIALOG_ID);
  const queueKey = JSON.stringify(DECISION_QUEUE_KEY);
  const saveKey = JSON.stringify(STEP_SAVE_KEY);
  return `(function(){if(window.__pfDecisionMemory)return;window.__pfDecisionMemory=1;var key=${key};var ack=${ack};var id=${id};var queueKey=${queueKey};var saveKey=${saveKey};function store(name,value){try{sessionStorage.setItem(name,value);}catch(e){}}function read(name){try{return sessionStorage.getItem(name)||"";}catch(e){return"";}}function pending(){return read(key);}function wanted(){var decision=pending();return decision==="APPROVED"||decision==="DECLINED";}function busy(){var started=Number(read(saveKey)||0);if(!started)return false;if(Date.now()-started>30000){try{sessionStorage.removeItem(saveKey);}catch(e){}return false;}return true;}function dialog(){return document.getElementById(id);}function restoreBox(node){try{var box=node.querySelector('[data-decision-ack="1"]');if(box&&read(ack)==="1")box.checked=true;}catch(e){}}function show(node){if(!node||node.getAttribute("data-decision-closing")==="1")return;if(typeof node.showModal==="function"&&!node.open){node.setAttribute("data-pending",pending());node.showModal();}restoreBox(node);}function finishSave(){try{sessionStorage.removeItem(saveKey);}catch(e){}window.dispatchEvent(new Event("pf-step-save"));}document.addEventListener("submit",function(event){var form=event.target;if(!form||!form.getAttribute||form.getAttribute("data-step-save")!=="1")return;store(saveKey,String(Date.now()));},true);function hookHistory(name){var original=history[name];if(!original||original.__pfStepSave)return;var wrapped=function(){var result=original.apply(this,arguments);finishSave();return result;};wrapped.__pfStepSave=1;history[name]=wrapped;}hookHistory("pushState");hookHistory("replaceState");window.addEventListener("pageshow",finishSave);document.addEventListener("click",function(event){var node=event.target;if(!node||!node.closest)return;var open=node.closest("[data-decision-open]");if(open){var decision=open.getAttribute("data-decision-open")||"";store(key,decision);var opened=dialog();if(opened)opened.removeAttribute("data-decision-closing");show(opened);return;}if(node.closest("[data-decision-cancel]")){try{sessionStorage.removeItem(key);sessionStorage.removeItem(ack);sessionStorage.removeItem(queueKey);}catch(e){}var cancelled=dialog();if(cancelled){cancelled.setAttribute("data-decision-closing","1");if(cancelled.open&&typeof cancelled.close==="function")cancelled.close();}return;}var confirm=node.closest("[data-decision-confirm]");if(!confirm)return;var current=dialog();if(!current)return;if(current.getAttribute("data-react-bound")==="1")return;var decision=pending();if(decision!=="APPROVED"&&decision!=="DECLINED")return;var box=current.querySelector('[data-decision-ack="1"]');if(decision==="APPROVED"&&box&&!box.checked){var error=current.querySelector("[data-decision-error]");if(error){error.hidden=false;error.textContent="Check the box to confirm this approval. Approval was not sent.";}event.preventDefault();event.stopPropagation();return;}var form=document.querySelector("form[data-decision-form]");if(!form)return;event.preventDefault();event.stopPropagation();var applicationId="";var caseId="";var app=form.querySelector('input[name="applicationId"]');var caseInput=form.querySelector('input[name="caseId"]');if(app)applicationId=app.value||"";if(caseInput)caseId=caseInput.value||"";var waiting=busy()||confirm.getAttribute("aria-disabled")==="true";store(queueKey,JSON.stringify({applicationId:applicationId,caseId:caseId,decision:decision,ack:!!(box&&box.checked),at:Date.now(),waiting:waiting}));if(waiting){var wait=current.querySelector("[data-decision-error]");if(wait){wait.hidden=false;wait.textContent="Saving this step. Approval sends when that finishes.";}return;}if(box&&box.checked){var strong=form.querySelector('input[name="confirmStrong"]');if(strong)strong.value="yes";var legit=form.querySelector('input[name="confirmNotLegit"]');if(legit)legit.value="yes";}try{sessionStorage.removeItem(key);sessionStorage.removeItem(ack);}catch(e){}var status=current.querySelector("[data-decision-error]");if(status){status.hidden=false;status.textContent="Saving approval...";}var confirmBtn=current.querySelector("[data-decision-confirm]");if(confirmBtn){confirmBtn.setAttribute("aria-disabled","true");confirmBtn.textContent="Saving approval...";}form.setAttribute("data-decision-allow","1");var button=form.querySelector('button[name="decision"][value="'+decision+'"]');if(button&&form.requestSubmit)form.requestSubmit(button);},true);document.addEventListener("change",function(event){var box=event.target;if(!box||box.getAttribute("data-decision-ack")!=="1")return;store(ack,box.checked?"1":"0");},true);document.addEventListener("cancel",function(event){if(event.target&&event.target.id===id){try{sessionStorage.removeItem(key);sessionStorage.removeItem(ack);}catch(e){}}},true);document.addEventListener("close",function(event){var node=event.target;if(!node||node.id!==id)return;if(node.getAttribute("data-decision-closing")==="1")return;if(!wanted())return;if(!document.documentElement.contains(node))return;if(typeof node.showModal==="function"&&!node.open)node.showModal();},true);})();`;
}
