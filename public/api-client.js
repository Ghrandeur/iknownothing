(() => {
  let csrfToken = "";

  async function responseJson(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    return response.json();
  }

  function requestError(response, result) {
    if (result?.error) return result.error;
    if (response.status === 404) {
      return "Account, application, and payment services are not enabled on this static deployment yet.";
    }
    return "The request could not be completed.";
  }

  async function refreshCsrf() {
    const response = await fetch("/api/csrf", { credentials: "same-origin", cache: "no-store" });
    const result = await responseJson(response);
    if (!response.ok || !result?.token) {
      throw new Error(requestError(response, result) || "Unable to start a secure session.");
    }
    csrfToken = result.token;
    return csrfToken;
  }

  async function request(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    if (!["GET", "HEAD"].includes(method)) {
      if (!csrfToken) await refreshCsrf();
      headers.set("X-CSRF-Token", csrfToken);
    }
    let body = options.body;
    if (body && !(body instanceof FormData) && typeof body !== "string") {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }
    const response = await fetch(url, { ...options, method, headers, body, credentials: "same-origin" });
    if (response.status === 403 && method !== "GET" && !url.endsWith("/api/auth/login")) {
      csrfToken = "";
    }
    const result = await responseJson(response);
    if (!response.ok) throw new Error(requestError(response, result));
    if (result) return result;
    return response;
  }

  function displayMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    element.classList.toggle("error", isError);
    element.setAttribute("role", isError ? "alert" : "status");
  }

  window.nlqiApi = { request, refreshCsrf, displayMessage };
})();
