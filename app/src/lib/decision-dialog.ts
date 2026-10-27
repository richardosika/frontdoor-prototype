export const DECISION_MEMORY_KEY = "pf-decision";
export const DECISION_ACK_KEY = "pf-decision-ack";
export const DECISION_DIALOG_ID = "pf-decision-dialog";

/**
 * Runs from the server HTML, before React hydrates.
 * A click on Approve opens the dialog and keeps the checkbox tick even when
 * hydration or a later render resets React state.
 */
export function decisionDialogBootstrap(): string {
  const key = JSON.stringify(DECISION_MEMORY_KEY);
  const ack = JSON.stringify(DECISION_ACK_KEY);
  const id = JSON.stringify(DECISION_DIALOG_ID);
  return `(function(){if(window.__pfDecisionMemory)return;window.__pfDecisionMemory=1;var key=${key};var ack=${ack};var id=${id};function store(name,value){try{sessionStorage.setItem(name,value);}catch(e){}}function clear(){try{sessionStorage.removeItem(key);sessionStorage.removeItem(ack);}catch(e){}}document.addEventListener("click",function(event){var node=event.target;if(!node||!node.closest)return;var open=node.closest("[data-decision-open]");if(open){var decision=open.getAttribute("data-decision-open")||"";store(key,decision);var dialog=document.getElementById(id);if(dialog&&typeof dialog.showModal==="function"&&!dialog.open){dialog.setAttribute("data-pending",decision);dialog.showModal();}}else if(node.closest("[data-decision-cancel]")){clear();}},true);document.addEventListener("change",function(event){var box=event.target;if(!box||box.getAttribute("data-decision-ack")!=="1")return;store(ack,box.checked?"1":"0");},true);})();`;
}
