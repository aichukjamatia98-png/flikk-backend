// api.js
// A thin wrapper around the Flikk backend's REST API. Import these
// functions from your frontend (web or React Native) instead of writing
// fetch() calls everywhere. Update BASE_URL to match where your backend
// is actually running.

const BASE_URL ='https://flikk-backend-production.up.railway.app/api';


// The login token gets stored here after signup/login, and attached to
// every request that needs it. It's also saved to localStorage so the
// user stays logged in after closing and reopening the browser tab.
//
// If you're using this in React Native instead of a website, swap the
// two localStorage lines below for AsyncStorage (see the note at the
// bottom of this file).
let authToken = (typeof localStorage !== 'undefined') ? localStorage.getItem('flikk_token') : null;

export function setToken(token) {
  authToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) localStorage.setItem('flikk_token', token);
    else localStorage.removeItem('flikk_token');
  }
}

export function getToken() {
  return authToken;
}

export function logout() {
  setToken(null);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

// ---- Auth ----

export async function signup({ username, email, password, full_name }) {
  const data = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, full_name })
  });
  setToken(data.token);
  return data.user;
}

export async function login({ username, password }) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  setToken(data.token);
  return data.user;
}

export function getMe() {
  return request('/auth/me');
}

// ---- Posts ----

export function getFeed() {
  return request('/posts');
}

export function createPost({ image_url, caption, location }) {
  return request('/posts', {
    method: 'POST',
    body: JSON.stringify({ image_url, caption, location })
  });
}

export function toggleLike(postId) {
  return request(`/posts/${postId}/like`, { method: 'POST' });
}

export function getComments(postId) {
  return request(`/posts/${postId}/comments`);
}

export function addComment(postId, text) {
  return request(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
}

// ---- Users ----

export function getProfile(username) {
  return request(`/users/${username}`);
}

export function toggleFollow(username) {
  return request(`/users/${username}/follow`, { method: 'POST' });
}

export function getNotifications() {
  return request('/users/me/notifications');
}

// ---- Messages ----

export function getConversations() {
  return request('/messages');
}

export function getChatHistory(username) {
  return request(`/messages/${username}`);
}

export function sendMessage(username, text) {
  return request(`/messages/${username}`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
}

// ---- Upload ----
// This one is different - it sends a file, not JSON, so it can't use
// the request() helper above.

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed.');
  return data.url;
}

// ---- React Native note ----
// localStorage doesn't exist in React Native. Use AsyncStorage instead:
//
//   import AsyncStorage from '@react-native-async-storage/async-storage';
//
//   export async function setToken(token) {
//     authToken = token;
//     if (token) await AsyncStorage.setItem('flikk_token', token);
//     else await AsyncStorage.removeItem('flikk_token');
//   }
//
//   // Call this once when your app starts, before rendering the main screen:
//   export async function loadStoredToken() {
//     authToken = await AsyncStorage.getItem('flikk_token');
//     return authToken;
//   }
