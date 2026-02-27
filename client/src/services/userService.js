// client/src/services/userService.js
import api from "../api/api";

export async function getServerInfo() {
  const { data } = await api.get("/info");
  return data;
}
