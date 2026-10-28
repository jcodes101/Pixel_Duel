export function createLobby(onJoin) {
  const roomCode = document.querySelector("#room-code");
  const error = document.querySelector("#menu-error");
  const status = document.querySelector("#connection-status");
  const createButton = document.querySelector("#create-room");
  const joinButton = document.querySelector("#join-room");
  let busy = false;

  function setStatus(message, kind = "neutral") {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function setBusy(value) {
    busy = value;
    createButton.disabled = value;
    joinButton.disabled = value;
    roomCode.disabled = value;
    createButton.textContent = value ? "Connecting..." : "Create Room";
  }

  async function submit(create) {
    if (busy) return;
    error.textContent = "";
    setBusy(true);
    setStatus(create ? "Opening a private duel..." : "Finding your opponent...");
    try {
      await onJoin(create ? "" : roomCode.value.trim().toUpperCase());
    } catch (joinError) {
      error.textContent = joinError.message;
      setStatus("The room could not be joined.", "error");
      setBusy(false);
    }
  }

  createButton.addEventListener("click", () => submit(true));
  joinButton.addEventListener("click", () => submit(false));
  roomCode.addEventListener("keydown", event => {
    if (event.key === "Enter") submit(false);
  });

  return {
    setStatus,
    setBusy,
    showError(message) {
      error.textContent = message;
      setStatus("The room could not be joined.", "error");
      setBusy(false);
    }
  };
}
