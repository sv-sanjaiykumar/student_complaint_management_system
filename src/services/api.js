const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";
let accessToken = null;
let refreshPromise = null;

export const categories = ["Academic", "Fee", "Certificate", "Hostel", "Other"];
export const statuses = ["Pending", "In Progress", "Resolved", "Rejected"];
export const priorities = ["Low", "Medium", "High", "Urgent"];

function normalizeUser(user) {
  if (!user) return user;
  return { ...user, role: user.role?.toLowerCase() };
}

function normalizeRequest(item) {
  if (!item) return item;
  return {
    ...item,
    category: item.category ? `${item.category[0].toUpperCase()}${item.category.slice(1)}` : item.category,
    notes: item.notes || item.internalNotes?.map((note) => note.note) || [],
    timeline: item.timeline?.map((entry) => ({ ...entry, date: entry.date || entry.at })) || [],
    replies: item.replies?.map(normalizeReply) || [],
  };
}

function normalizeReply(reply) {
  if (!reply) return reply;
  return {
    ...reply,
    author: typeof reply.author === "string" ? reply.author : reply.author?.name || "Admin",
  };
}

async function rawRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The API returned an invalid response.");
  }
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || "The request failed.");
    error.status = response.status;
    error.code = payload.error?.code;
    error.details = payload.error?.details;
    throw error;
  }
  return payload.data;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = rawRequest("/auth/refresh", { method: "POST" })
      .then((data) => {
        if (!data.accessToken) {
          accessToken = null;
          return false;
        }
        accessToken = data.accessToken;
        return true;
      })
      .catch(() => {
        accessToken = null;
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function apiRequest(path, options = {}, canRefresh = true) {
  try {
    return await rawRequest(path, options);
  } catch (error) {
    const isAuthRoute = path.startsWith("/auth/");
    if (error.status === 401 && canRefresh && !isAuthRoute && await refreshAccessToken()) {
      return rawRequest(path, options);
    }
    throw error;
  }
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export async function loginRequest({ email, password, role }) {
  const data = await rawRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role: role === "admin" ? "Admin" : "Student" }),
  });
  accessToken = data.accessToken;
  return { ...data, user: normalizeUser(data.user) };
}

export async function registerAdmin(payload) {
  const data = await rawRequest("/auth/admin/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  accessToken = data.accessToken;
  return { ...data, user: normalizeUser(data.user) };
}

export async function getAdminRegistrationStatus() {
  return rawRequest("/auth/admin/registration-status");
}

export async function restoreSession() {
  const data = await refreshAccessToken();
  if (!data) return null;
  const response = await apiRequest("/auth/me", {}, false);
  return normalizeUser(response.user);
}

export async function logoutRequest() {
  try {
    await rawRequest("/auth/logout", { method: "POST" });
  } finally {
    accessToken = null;
  }
}

export async function getStudentDashboard() {
  return apiRequest("/students/dashboard");
}

export async function getStudentRequests(_studentId, query = {}) {
  const params = new URLSearchParams({ page: "1", pageSize: "100", ...query });
  const data = await apiRequest(`/requests/me?${params}`);
  return data.items.map(normalizeRequest);
}

export async function getRequest(id) {
  const data = await apiRequest(`/requests/${encodeURIComponent(id)}`);
  return normalizeRequest(data.request);
}

export async function createRequest(payload) {
  const body = new FormData();
  body.set("subject", payload.subject);
  body.set("category", payload.category.toLowerCase());
  body.set("priority", payload.priority);
  body.set("description", payload.description);
  if (payload.attachment) body.set("attachment", payload.attachment);
  const data = await apiRequest("/requests", { method: "POST", body });
  return normalizeRequest(data.request);
}

export async function getAdminDashboard() {
  return apiRequest("/admin/dashboard");
}

export async function getAdminRequests() {
  const params = new URLSearchParams({ page: "1", pageSize: "100", sortBy: "updatedAt", sortOrder: "desc" });
  const data = await apiRequest(`/admin/requests?${params}`);
  return data.items.map(normalizeRequest);
}

export async function getAdminUsers() {
  const data = await apiRequest("/admin/users");
  return data.users;
}

export async function getStaff() {
  const data = await apiRequest("/admin/staff");
  return data.staff;
}

export async function getStudents() {
  const data = await apiRequest("/admin/students");
  return data.users;
}

export async function createStudent(payload) {
  const data = await apiRequest("/admin/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeUser(data.user);
}

export async function updateRequest(id, changes) {
  const encodedId = encodeURIComponent(id);
  let path;
  let body;
  if (changes.status) {
    path = `/admin/requests/${encodedId}/status`;
    body = { status: changes.status };
  } else if (changes.priority) {
    path = `/admin/requests/${encodedId}/priority`;
    body = { priority: changes.priority };
  } else if (Object.hasOwn(changes, "assignedTo")) {
    path = `/admin/requests/${encodedId}/assign`;
    body = { staffId: changes.assignedTo };
  } else if (Object.hasOwn(changes, "staffId")) {
    path = `/admin/requests/${encodedId}/assign`;
    body = { staffId: changes.staffId };
  } else if (changes.archived) {
    path = `/admin/requests/${encodedId}/archive`;
  } else {
    throw new Error("Unsupported request update.");
  }
  const data = await apiRequest(path, { method: "PATCH", ...(body && { body: JSON.stringify(body) }) });
  return normalizeRequest(data.request);
}

export async function addReply(id, message) {
  const data = await apiRequest(`/admin/requests/${encodeURIComponent(id)}/replies`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  return normalizeReply(data.reply);
}

export async function addNote(id, note) {
  const data = await apiRequest(`/admin/requests/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
  return normalizeRequest(data.request);
}

export async function deleteRequest(id) {
  return apiRequest(`/admin/requests/${encodeURIComponent(id)}`, { method: "DELETE" });
}
