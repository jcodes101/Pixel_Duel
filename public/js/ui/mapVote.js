import { drawMap } from "../game/mapRenderer.js";

function createPreview(canvas, map, width = 160, height = 90) {
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.save();
  context.scale(width / 480, height / 270);
  drawMap(context, map, 0, 0, null, true);
  context.restore();
}

export function createMapVote(maps, submitVote) {
  const cards = document.querySelector("#map-cards");
  const voteStatus = document.querySelector("#map-vote-status");
  const revealVotes = document.querySelector("#map-reveal-votes");
  const revealPreview = document.querySelector("#map-reveal-preview");
  const revealName = document.querySelector("#map-reveal-name");
  const revealDescription = document.querySelector("#map-reveal-description");
  const buttons = [];
  let submitting = false;
  let localVote = null;
  let latestState = null;

  maps.forEach(map => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-card";
    button.dataset.mapId = map.id;
    button.setAttribute("aria-label", `Vote for ${map.name}`);

    const preview = document.createElement("canvas");
    preview.className = "map-card__preview";
    preview.setAttribute("aria-hidden", "true");
    createPreview(preview, map);

    const name = document.createElement("span");
    name.className = "map-card__name";
    name.textContent = map.name;
    const description = document.createElement("span");
    description.className = "map-card__description";
    description.textContent = map.description;
    const locked = document.createElement("span");
    locked.className = "map-card__locked";
    button.append(preview, name, description, locked);
    button.addEventListener("click", async () => {
      if (submitting || button.disabled) return;
      submitting = true;
      voteStatus.textContent = "Locking your map vote...";
      try {
        await submitVote(map.id);
        localVote = map.id;
        if (latestState) render(latestState);
      } catch (error) {
        voteStatus.textContent = error.message;
      } finally {
        submitting = false;
      }
    });
    buttons.push({ button, locked });
    cards.append(button);
  });

  function render(state) {
      latestState = state;
      const myVoteLocked = state.mapVoteLocks?.[state.you] === true;
      const yourLabel = `P${state.you + 1} (You)`;
      const opponentLabel = `P${2 - state.you} (Opponent)`;
      const opponentLocked = state.mapVoteLocks?.[1 - state.you] === true;
      voteStatus.textContent = myVoteLocked
        ? `${yourLabel} locked in · ${opponentLabel} ${opponentLocked ? "locked in" : "choosing"}`
        : opponentLocked ? `${opponentLabel} is ready · choose your map`
          : "Votes stay hidden until both players lock in.";
      buttons.forEach(({ button, locked }) => {
        button.disabled = myVoteLocked || submitting;
        const selected = myVoteLocked && localVote === button.dataset.mapId;
        locked.textContent = selected ? `${yourLabel} · LOCKED` : "";
        button.classList.toggle("map-card--locked", myVoteLocked);
        button.classList.toggle("map-card--selected", selected);
      });

      const reveal = state.mapReveal;
      if (!reveal) return;
      const selectedMap = maps.find(map => map.id === reveal.mapId);
      if (!selectedMap) return;
      revealVotes.replaceChildren();
      reveal.votes.forEach((vote, index) => {
        const map = maps.find(entry => entry.id === vote);
        const line = document.createElement("p");
        line.textContent = `P${index + 1} voted · ${map?.name || "Unknown map"}`;
        revealVotes.append(line);
      });
      revealName.textContent = selectedMap.name;
      revealDescription.textContent = selectedMap.description;
      createPreview(revealPreview, selectedMap, 320, 180);
  }

  return { render };
}
