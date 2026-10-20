const api = window.nlqiApi;
const yearLabel = document.querySelector("#year");
if (yearLabel) yearLabel.textContent = String(new Date().getFullYear());

function showPortalMessage(message, error = false) {
  api.displayMessage(document.querySelector("[data-message]"), message, error);
}

function emailNote(status) {
  if (status === "development-console") return " In local development, the email was printed in the server console.";
  if (status === "failed") return " Your account update succeeded, but the email could not be delivered; contact NLQI.";
  return "";
}

async function formRequest(form, endpoint, options = {}) {
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  showPortalMessage("");
  try {
    const result = await api.request(endpoint, options);
    showPortalMessage(result.message || "Done.");
    return result;
  } catch (error) {
    showPortalMessage(error.message, true);
    return null;
  } finally {
    if (submit) submit.disabled = false;
  }
}

const registerForm = document.querySelector("#register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!registerForm.reportValidity()) return;
    const fields = new FormData(registerForm);
    if (fields.get("password") !== fields.get("confirmPassword")) {
      showPortalMessage("The passwords do not match.", true);
      return;
    }
    const result = await formRequest(registerForm, "/api/auth/register", {
      method: "POST",
      body: { name: fields.get("name"), email: fields.get("email"), password: fields.get("password") },
    });
    if (result) registerForm.reset();
  });
}

const resendForm = document.querySelector("#resend-form");
if (resendForm) {
  resendForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!resendForm.reportValidity()) return;
    const fields = new FormData(resendForm);
    await formRequest(resendForm, "/api/auth/resend-verification", {
      method: "POST",
      body: { email: fields.get("email") },
    });
  });
}

const loginForm = document.querySelector("#login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const fields = new FormData(loginForm);
    const result = await formRequest(loginForm, "/api/auth/login", {
      method: "POST",
      body: { email: fields.get("email"), password: fields.get("password") },
    });
    if (result?.user) {
      window.location.href = result.user.role === "admin"
        ? "/admin"
        : result.user.role === "judge" ? "/judge" : "/track";
    }
  });
}

const verifyMessage = document.querySelector("#verify-message");
if (verifyMessage) {
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) {
    api.displayMessage(verifyMessage, "This verification link is missing its token.", true);
  } else {
    api.request("/api/auth/verify-email", { method: "POST", body: { token } })
      .then((result) => api.displayMessage(verifyMessage, `${result.message}${emailNote(result.emailStatus)}`, false))
      .catch((error) => api.displayMessage(verifyMessage, error.message, true));
  }
}

const forgotForm = document.querySelector("#forgot-form");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!forgotForm.reportValidity()) return;
    const fields = new FormData(forgotForm);
    const result = await formRequest(forgotForm, "/api/auth/forgot-password", {
      method: "POST",
      body: { email: fields.get("email") },
    });
    if (result) forgotForm.reset();
  });
}

const resetForm = document.querySelector("#reset-form");
if (resetForm) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!resetForm.reportValidity()) return;
    const fields = new FormData(resetForm);
    const result = await formRequest(resetForm, "/api/auth/reset-password", {
      method: "POST",
      body: {
        token: new URLSearchParams(window.location.search).get("token"),
        password: fields.get("password"),
      },
    });
    if (result) {
      resetForm.reset();
      window.location.href = "/login";
    }
  });
}

async function loadApplicantTrack() {
  const status = document.querySelector("#track-status");
  const logout = document.querySelector("#logout-button");
  const paymentMessage = document.querySelector("#payment-message");
  if (!status) return;
  try {
    const result = await api.request("/api/auth/me");
    document.querySelector("#track-name").textContent = result.user.name;
    document.querySelector("#track-email").textContent = result.user.email;
    const application = result.application;
    document.querySelector("#track-number").textContent = application?.application_number || "Application not created";
    document.querySelector("#track-status").textContent = application?.status || "No application";
    document.querySelector("#track-payment").textContent = application?.payment_status || "unpaid";
    if (paymentMessage && new URLSearchParams(window.location.search).get("checkout") === "unavailable") {
      paymentMessage.textContent = "Your application was submitted, but online checkout could not be opened. You can retry payment here, or contact NLQI for assistance.";
      paymentMessage.hidden = false;
    }
    document.querySelector("#notification-list").replaceChildren();
    const notifications = await api.request("/api/notifications");
    notifications.notifications.forEach((item) => {
      const article = document.createElement("article");
      article.className = "portal-notification";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const message = document.createElement("p");
      message.textContent = item.message;
      const date = document.createElement("small");
      date.textContent = new Date(item.createdAt).toLocaleString();
      article.append(title, message, date);
      document.querySelector("#notification-list").append(article);
    });
  } catch (error) {
    status.textContent = error.message;
  }
  logout?.addEventListener("click", async () => {
    try {
      await api.request("/api/auth/logout", { method: "POST", body: {} });
      window.location.href = "/login";
    } catch (error) {
      status.textContent = error.message;
    }
  }, { once: true });
  document.querySelector("#pay-now")?.addEventListener("click", async () => {
    try {
      const result = await api.request("/api/payments/initialize", { method: "POST", body: {} });
      window.location.href = result.authorizationUrl;
    } catch (error) {
      if (paymentMessage) {
        paymentMessage.textContent = error.message;
        paymentMessage.hidden = false;
      } else {
        status.textContent = error.message;
      }
    }
  }, { once: true });
  const reference = new URLSearchParams(window.location.search).get("reference");
  if (reference) {
    try {
      const result = await api.request("/api/payments/verify", { method: "POST", body: { reference } });
      status.textContent = `${result.message}${emailNote(result.emailStatus)}`;
      window.history.replaceState({}, "", "/track");
      await loadApplicantTrack();
    } catch (error) {
      status.textContent = error.message;
    }
  }
}

loadApplicantTrack();

async function loadAdmin() {
  const root = document.querySelector("#admin-applications");
  if (!root) return;
  const metrics = document.querySelector("#admin-metrics");
  const statusMessage = document.querySelector("#admin-message");
  try {
    const summary = await api.request("/api/admin/metrics");
    metrics.innerHTML = "";
    [
      ["Applications", summary.total],
      ["In review", summary.pending],
      ["Shortlisted", summary.shortlisted],
      ["Approved", summary.approved],
      ["Paid", summary.paid],
      ["Payments", `${summary.currency} ${Number(summary.revenue).toLocaleString()}`],
    ].forEach(([label, value]) => {
      const card = document.createElement("article");
      card.className = "metric-card";
      const strong = document.createElement("strong");
      strong.textContent = value ?? 0;
      const small = document.createElement("span");
      small.textContent = label;
      card.append(strong, small);
      metrics.append(card);
    });
    const params = new URLSearchParams();
    const statusFilter = document.querySelector("#filter-status").value;
    const search = document.querySelector("#filter-search").value.trim();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const result = await api.request(`/api/admin/applications?${params}`);
    root.replaceChildren();
    if (!result.applications.length) {
      root.textContent = "No applications match these filters.";
      return;
    }
    result.applications.forEach((application) => {
      const card = document.createElement("article");
      card.className = "admin-app-card";
      const heading = document.createElement("div");
      heading.className = "admin-app-heading";
      const name = document.createElement("h3");
      name.textContent = application.name;
      const number = document.createElement("span");
      number.textContent = application.applicationNumber;
      heading.append(name, number);
      const email = document.createElement("p");
      email.textContent = application.email;
      const status = document.createElement("p");
      status.textContent = `Status: ${application.status} · Payment: ${application.paymentStatus}`;
      const answers = document.createElement("details");
      const summaryLine = document.createElement("summary");
      summaryLine.textContent = "Review application answers";
      const answerGrid = document.createElement("dl");
      Object.entries(application.data).forEach(([key, value]) => {
        const label = document.createElement("dt");
        label.textContent = key;
        const answer = document.createElement("dd");
        answer.textContent = String(value);
        answerGrid.append(label, answer);
      });
      answers.append(summaryLine, answerGrid);
      const actions = document.createElement("div");
      actions.className = "admin-app-actions";
      ["headshot", "fullBody", "identityDocument"].forEach((kind) => {
        if (!application.uploads.includes(kind)) return;
        const link = document.createElement("a");
        link.href = `/api/admin/applications/${application.id}/documents/${kind}`;
        link.textContent = `${kind} file`;
        link.className = "text-link";
        actions.append(link);
      });
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Status for ${application.applicationNumber}`);
      ["pending", "shortlisted", "approved", "rejected"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === application.status;
        select.append(option);
      });
      const save = document.createElement("button");
      save.type = "button";
      save.className = "button button-dark";
      save.textContent = "Update status";
      save.addEventListener("click", async () => {
        try {
          const response = await api.request(`/api/admin/applications/${application.id}/status`, {
            method: "PATCH", body: { status: select.value },
          });
          statusMessage.textContent = `${response.message}${emailNote(response.emailStatus)}`;
          await loadAdmin();
        } catch (error) {
          statusMessage.textContent = error.message;
        }
      });
      actions.append(select, save);
      card.append(heading, email, status, answers, actions);
      root.append(card);
    });
  } catch (error) {
    statusMessage.textContent = error.message;
    if (error.message.includes("Administrator") || error.message.includes("sign in")) {
      window.location.href = "/login";
    }
  }
}

document.querySelector("#admin-filter")?.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAdmin();
});
document.querySelector("#admin-refresh")?.addEventListener("click", loadAdmin);
document.querySelector("#admin-export")?.addEventListener("click", async () => {
  try {
    const response = await api.request("/api/admin/applications/export.csv");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nlqi-applications.csv";
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    document.querySelector("#admin-message").textContent = error.message;
  }
});
document.querySelector("#admin-logout")?.addEventListener("click", async () => {
  try {
    await api.request("/api/auth/logout", { method: "POST", body: {} });
    window.location.href = "/login";
  } catch (error) {
    document.querySelector("#admin-message").textContent = error.message;
  }
});
loadAdmin();
