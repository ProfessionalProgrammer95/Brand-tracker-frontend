import axios from "axios";

const BASE_URL = "http://localhost:5000/api/mentions";

export const getNewsMentions = (q: string) =>
  axios.get(`${BASE_URL}/news?q=${encodeURIComponent(q)}`);

export const getRedditMentions = (q: string) =>
  axios.get(`${BASE_URL}/reddit?q=${encodeURIComponent(q)}`);

export const getTwitterMentions = (q: string) =>
  axios.get(`${BASE_URL}/twitter?q=${encodeURIComponent(q)}`);

export const getWebMentions = (q: string) =>
  axios.get(`${BASE_URL}/web?q=${encodeURIComponent(q)}`);

export const clusterMentions = async (mentions: any[]) => {
  return axios.post(`${BASE_URL}/cluster`, { mentions });
};