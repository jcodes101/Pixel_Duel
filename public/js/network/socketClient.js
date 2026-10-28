import { createSocketSession } from "./socketSession.mjs";

const session = createSocketSession(window.io());

export const joinRoom = (...args) => session.joinRoom(...args);
export const configureCharacter = (...args) => session.configureCharacter(...args);
export const submitMapVote = (...args) => session.submitMapVote(...args);
export const submitMove = (...args) => session.submitMove(...args);
export const requestRematch = (...args) => session.requestRematch(...args);
export const leaveRoom = (...args) => session.leaveRoom(...args);
export const onState = (...args) => session.onState(...args);
export const onOpponentLeft = (...args) => session.onOpponentLeft(...args);
export const onConnectionChange = (...args) => session.onConnectionChange(...args);
export const onRoomInterrupted = (...args) => session.onRoomInterrupted(...args);
