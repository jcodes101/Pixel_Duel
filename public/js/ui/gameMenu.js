export function createGameMenu(onLeave) {
  const dialog = document.querySelector("#game-menu-dialog");
  const trigger = document.querySelector("#open-game-menu");
  const actions = document.querySelector("#game-menu-actions");
  const confirmation = document.querySelector("#leave-confirmation");
  const resume = document.querySelector("#resume-game");
  const leave = document.querySelector("#leave-game");
  const confirm = document.querySelector("#confirm-leave-game");
  const cancel = document.querySelector("#cancel-leave-game");
  const error = document.querySelector("#leave-error");
  let submitting = false;

  function focusTrigger() {
    if (!trigger.disabled && !trigger.closest(".screen")?.hidden) trigger.focus();
  }

  function open() {
    if (dialog.open) return;
    actions.hidden = false;
    confirmation.hidden = true;
    error.textContent = "";
    dialog.showModal();
    resume.focus();
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
    actions.hidden = false;
    confirmation.hidden = true;
    error.textContent = "";
    focusTrigger();
  }

  trigger.addEventListener("click", open);
  resume.addEventListener("click", close);
  leave.addEventListener("click", () => {
    actions.hidden = true;
    confirmation.hidden = false;
    error.textContent = "";
    cancel.focus();
  });
  cancel.addEventListener("click", () => {
    confirmation.hidden = true;
    actions.hidden = false;
    error.textContent = "";
    leave.focus();
  });
  confirm.addEventListener("click", async () => {
    if (submitting) return;
    submitting = true;
    confirm.disabled = true;
    confirm.textContent = "Leaving...";
    error.textContent = "";
    try {
      await onLeave();
      close();
    } catch (leaveError) {
      error.textContent = leaveError.message || "The room could not be left.";
    } finally {
      submitting = false;
      confirm.disabled = false;
      confirm.textContent = "Leave Game";
    }
  });
  dialog.addEventListener("cancel", event => {
    if (!confirmation.hidden) {
      event.preventDefault();
      confirmation.hidden = true;
      actions.hidden = false;
      leave.focus();
    }
  });
  dialog.addEventListener("close", focusTrigger);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !dialog.open && !trigger.closest(".screen")?.hidden) {
      event.preventDefault();
      open();
    }
  });

  return { open, close };
}
