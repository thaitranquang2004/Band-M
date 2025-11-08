import io from "socket.io-client";

const socket = io(process.env.REACT_APP_API_URL || "/"); // Relative cho Render prod

export default socket;
