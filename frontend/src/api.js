import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api" });
// change if backend running elsewhere

export const createDocument = async () => {
  const { data } = await API.post("/documents");
  return data; // { _id: "...", content: "" }
};

export const getDocument = async (id) => {
  const { data } = await API.get(`/documents/${id}`);
  return data; // { _id, content }
};

export const updateDocument = async (id, content) => {
  await API.put(`/documents/${id}`, { content });
};
