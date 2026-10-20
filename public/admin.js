(() => {
  const api = window.nlqiApi;
  const get = (selector) => document.querySelector(selector);
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let editingContentId = null;

  function setStatus(message, error = false) {
    const status = get("#admin-message");
    if (!status) return;
    status.textContent = message;
    status.classList.add("show");
    status.classList.toggle("error", error);
  }

  async function fetchJson(url, options = {}) {
    return api.request(url, options);
  }

  const views = {
    applications: loadApplications,
    judges: loadJudges,
    users: loadUsers,
    analytics: loadAnalytics,
    content: loadContent,
    finance: loadFinance,
    audit: loadAudit,
    settings: loadSettings,
  };

  document.querySelectorAll("[data-admin-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.adminView;
      document.querySelectorAll(".admin-view").forEach((view) => {
        view.hidden = view.id !== `admin-${name}-view`;
      });
      document.querySelectorAll("[data-admin-view]").forEach((tab) => {
        tab.classList.toggle("active", tab === button);
      });
      views[name]?.();
    });
  });

  async function loadApplications() {
    try {
      await fetchJson("/api/admin/applications");
      setStatus("");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadJudges() {
    try {
      const { judges, criteria } = await fetchJson("/api/admin/judges");
      const root = get("#judge-list");
      root.replaceChildren();
      judges.forEach((judge) => {
        const card = element("article", "admin-app-card");
        const heading = element("div", "admin-app-heading");
        heading.append(element("h3", "", judge.name), element("span", "", judge.email));
        const details = element("p", "", `Assigned applications: ${judge.assignedApplications} · Scored: ${judge.scoredApplications} · ${judge.active ? "Active" : "Inactive"}`);
        const button = element("button", "button button-quiet", judge.active ? "Deactivate judge" : "Reactivate judge");
        button.type = "button";
        button.addEventListener("click", async () => {
          try {
            await fetchJson(`/api/admin/judges/${judge.id}`, { method: "PATCH", body: { active: !judge.active } });
            await loadJudges();
          } catch (error) {
            setStatus(error.message, true);
          }
        });
        card.append(heading, details);
        if (judge.bio) card.append(element("p", "", judge.bio));
        card.append(element("small", "", `Scoring criteria: ${criteria.join(", ")}`), button);
        root.append(card);
      });
      const judgeSelect = get("#assignment-judge");
      judgeSelect.replaceChildren();
      judges.filter((item) => item.active).forEach((item) => {
        const option = element("option", "", item.name);
        option.value = item.id;
        judgeSelect.append(option);
      });
      const applicationSelect = get("#assignment-application");
      const { applications } = await fetchJson("/api/admin/applications/assignable");
      applicationSelect.replaceChildren();
      applications.forEach((item) => {
        const option = element("option", "", `${item.applicationNumber} · ${item.applicantName || "Applicant"}`);
        option.value = item.id;
        applicationSelect.append(option);
      });
      const scores = await fetchJson("/api/admin/scoring");
      const scoreRoot = get("#scoring-summary");
      scoreRoot.replaceChildren(element("h3", "", "Scoring overview"));
      scores.applications.forEach((item) => {
        const card = element("article", "admin-app-card");
        card.append(
          element("strong", "", `${item.applicantName || "Applicant"} · ${item.applicationNumber}`),
          element("p", "", `Judges scored: ${item.judgesScored} · Average score: ${item.averageScore ?? "Not scored"}`),
        );
        scoreRoot.append(card);
      });
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  get("#judge-invite-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    try {
      const result = await fetchJson("/api/admin/judges", {
        method: "POST",
        body: { name: fields.get("name"), email: fields.get("email"), bio: fields.get("bio") },
      });
      setStatus(`${result.message}${result.emailStatus === "development-console" ? " The setup link is in the server console." : result.emailStatus === "failed" ? " Invitation email failed; use password recovery after SMTP is fixed." : ""}`);
      form.reset();
      await loadJudges();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  get("#assignment-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const judgeId = get("#assignment-judge").value;
    const applicationId = get("#assignment-application").value;
    if (!judgeId || !applicationId) return setStatus("Select an active judge and a submitted application.", true);
    try {
      const result = await fetchJson(`/api/admin/judges/${judgeId}/assignments`, {
        method: "POST",
        body: { applicationId: Number(applicationId) },
      });
      setStatus(result.message);
      await loadJudges();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  async function loadUsers() {
    try {
      const { users } = await fetchJson("/api/admin/users");
      const root = get("#admin-users");
      root.replaceChildren();
      users.forEach((user) => {
        const card = element("article", "admin-app-card");
        const heading = element("div", "admin-app-heading");
        heading.append(element("h3", "", user.name), element("span", "", user.email));
        const detail = element("p", "", `${user.role} · ${user.status} · Email ${user.emailVerified ? "verified" : "unverified"} · Applications: ${user.applicationCount}`);
        card.append(heading, detail);
        if (user.role === "admin" || user.id === window.nlqiCurrentUserId) {
          root.append(card);
          return;
        }
        const controls = element("div", "admin-app-actions");
        const role = document.createElement("select");
        role.setAttribute("aria-label", `Role for ${user.email}`);
        ["applicant", "judge"].forEach((value) => {
          const option = element("option", "", value);
          option.value = value;
          option.selected = value === user.role;
          role.append(option);
        });
        const status = document.createElement("select");
        status.setAttribute("aria-label", `Account status for ${user.email}`);
        ["active", "suspended"].forEach((value) => {
          const option = element("option", "", value);
          option.value = value;
          option.selected = value === user.status;
          status.append(option);
        });
        const save = element("button", "button button-dark", "Save account");
        save.type = "button";
        save.addEventListener("click", async () => {
          try {
            await fetchJson(`/api/admin/users/${user.id}`, {
              method: "PATCH",
              body: { role: role.value, status: status.value },
            });
            await loadUsers();
          } catch (error) {
            setStatus(error.message, true);
          }
        });
        controls.append(role, status, save);
        card.append(controls);
        root.append(card);
      });
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function appendDataRows(container, rows) {
    container.replaceChildren();
    if (!rows.length) {
      container.append(element("p", "analytics-empty", "No submitted application data yet."));
      return;
    }
    const maximum = Math.max(...rows.map(([, value]) => value), 1);
    rows.forEach(([label, value]) => {
      const row = element("div", "analytics-row");
      const text = element("span", "", `${label} · ${value}`);
      const meter = element("span", "analytics-meter");
      const fill = element("i");
      fill.style.width = `${Math.max(2, value / maximum * 100)}%`;
      meter.append(fill);
      row.append(text, meter);
      container.append(row);
    });
  }

  async function loadAnalytics() {
    try {
      const data = await fetchJson("/api/admin/analytics");
      const ratios = get("#analytics-ratios");
      ratios.replaceChildren();
      [
        ["Submissions", data.total],
        ["Approved", `${data.approvedRatio}%`],
        ["Shortlisted", `${data.shortlistedRatio}%`],
        ["Paid", `${data.paidRatio}%`],
      ].forEach(([label, value]) => {
        const card = element("article", "metric-card");
        card.append(element("strong", "", value), element("span", "", label));
        ratios.append(card);
      });
      appendDataRows(get("#analytics-states"), data.byState);
      appendDataRows(get("#analytics-ages"), data.byAge);
      appendDataRows(get("#analytics-months"), data.byMonth);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  const contentDefinitions = {
    gallery: [
      ["title", "Title", "text", true], ["description", "Description", "textarea"],
      ["imageUrl", "Image URL (HTTPS or /images/...)", "text", true], ["sortOrder", "Sort order", "number"],
      ["active", "Published", "checkbox"],
    ],
    blog: [
      ["title", "Title", "text", true], ["slug", "URL slug", "text", true],
      ["excerpt", "Short summary", "textarea"], ["body", "Article body", "textarea", true],
      ["imageUrl", "Image URL (optional)", "text"], ["status", "Publication", "select"],
    ],
    sponsors: [
      ["name", "Sponsor name", "text", true], ["logoUrl", "Logo URL (optional)", "text"],
      ["websiteUrl", "Website URL (optional)", "url"], ["tier", "Tier", "select"],
      ["sortOrder", "Sort order", "number"], ["active", "Active", "checkbox"],
    ],
    partners: [
      ["name", "Partner name", "text", true], ["logoUrl", "Logo URL (optional)", "text"],
      ["websiteUrl", "Website URL (optional)", "url"], ["description", "Description", "textarea"],
      ["sortOrder", "Sort order", "number"], ["active", "Active", "checkbox"],
    ],
  };

  function createContentControl([name, label, type, required]) {
    const wrapper = element("label", `form-field${type === "textarea" && name === "body" ? " full" : ""}`, label);
    let control;
    if (type === "textarea") {
      control = document.createElement("textarea");
      control.rows = name === "body" ? 8 : 3;
    } else if (type === "select") {
      control = document.createElement("select");
      const values = name === "status" ? ["draft", "published"] : ["partner", "platinum", "gold", "silver", "bronze"];
      values.forEach((value) => control.append(element("option", "", value)));
    } else {
      control = document.createElement("input");
      control.type = type;
    }
    control.name = name;
    if (required) control.required = true;
    if (type === "checkbox") control.checked = true;
    if (type === "number") {
      control.min = "0";
      control.step = "1";
      control.value = "0";
    }
    wrapper.append(control);
    return wrapper;
  }

  function renderContentForm() {
    const type = get("#content-type").value;
    const form = get("#content-form");
    form.replaceChildren(...contentDefinitions[type].map(createContentControl));
    const submit = element("button", "button button-dark", "Create content");
    submit.type = "submit";
    form.append(submit);
  }

  function contentPayload(type, form) {
    const values = new FormData(form);
    const payload = {};
    contentDefinitions[type].forEach(([name, _label, inputType]) => {
      const control = form.elements.namedItem(name);
      payload[name] = inputType === "checkbox"
        ? control.checked
        : inputType === "number"
          ? Number(values.get(name) || 0)
          : values.get(name);
    });
    return payload;
  }

  async function loadContent() {
    const type = get("#content-type").value;
    try {
      const { items } = await fetchJson(`/api/admin/content/${type}`);
      const root = get("#content-list");
      root.replaceChildren();
      items.forEach((item) => {
        const card = element("article", "admin-app-card");
        const heading = element("div", "admin-app-heading");
        heading.append(
          element("h3", "", item.title || item.name),
          element("span", "", type === "blog" ? item.status : item.active ? "active" : "inactive"),
        );
        const description = item.excerpt || item.description || item.slug || item.websiteUrl || "";
        card.append(heading, element("p", "", description));
        const actions = element("div", "admin-app-actions");
        const edit = element("button", "button button-quiet", "Edit");
        edit.type = "button";
        edit.addEventListener("click", () => {
          editingContentId = item.id;
          const form = get("#content-form");
          contentDefinitions[type].forEach(([name, _label, inputType]) => {
            const control = form.elements.namedItem(name);
            if (!control) return;
            const value = item[name] ?? (name === "active" ? true : "");
            if (inputType === "checkbox") control.checked = Boolean(value);
            else control.value = value;
          });
          form.querySelector('[type="submit"]').textContent = "Save changes";
          get("#content-cancel").hidden = false;
          form.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        const remove = element("button", "button button-quiet", "Delete");
        remove.type = "button";
        remove.addEventListener("click", async () => {
          if (!window.confirm(`Delete “${item.title || item.name}”?`)) return;
          try {
            await fetchJson(`/api/admin/content/${type}/${item.id}`, { method: "DELETE" });
            if (editingContentId === item.id) resetContentForm();
            await loadContent();
          } catch (error) {
            setStatus(error.message, true);
          }
        });
        actions.append(edit, remove);
        card.append(actions);
        root.append(card);
      });
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function resetContentForm() {
    editingContentId = null;
    get("#content-form").reset();
    renderContentForm();
    get("#content-cancel").hidden = true;
  }

  get("#content-type")?.addEventListener("change", () => {
    resetContentForm();
    loadContent();
  });
  get("#content-cancel")?.addEventListener("click", resetContentForm);
  get("#content-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const type = get("#content-type").value;
    const payload = contentPayload(type, form);
    try {
      const result = editingContentId
        ? await fetchJson(`/api/admin/content/${type}/${editingContentId}`, { method: "PATCH", body: payload })
        : await fetchJson(`/api/admin/content/${type}`, { method: "POST", body: payload });
      setStatus(result.message);
      resetContentForm();
      await loadContent();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  async function loadFinance() {
    try {
      const params = new URLSearchParams();
      const status = get("#finance-status").value;
      const search = get("#finance-search").value.trim();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const data = await fetchJson(`/api/admin/finance?${params}`);
      const metrics = get("#finance-metrics");
      metrics.replaceChildren();
      [
        ["Transactions", data.summary.count],
        ["Paid", data.summary.paidCount || 0],
        ["Pending", data.summary.pendingCount || 0],
        ["Failed", data.summary.failedCount || 0],
        ["Revenue", `${data.currency} ${(data.summary.paidMinorUnits / 100).toLocaleString()}`],
      ].forEach(([label, value]) => {
        const card = element("article", "metric-card");
        card.append(element("strong", "", value), element("span", "", label));
        metrics.append(card);
      });
      const root = get("#finance-list");
      root.replaceChildren();
      if (!data.payments.length) {
        root.append(element("p", "analytics-empty", "No payment transactions match these filters."));
        return;
      }
      data.payments.forEach((payment) => {
        const card = element("article", "admin-app-card");
        const heading = element("div", "admin-app-heading");
        heading.append(
          element("h3", "", `${payment.currency} ${payment.amountMajorUnits.toLocaleString()}`),
          element("span", "", payment.status),
        );
        card.append(
          heading,
          element("p", "", `${payment.applicantName} · ${payment.applicantEmail}`),
          element("p", "", `${payment.applicationNumber} · ${payment.reference}`),
          element("small", "", `Created ${new Date(payment.createdAt).toLocaleString()}${payment.paidAt ? ` · Paid ${new Date(payment.paidAt).toLocaleString()}` : ""}${payment.channel ? ` · ${payment.channel}` : ""}`),
        );
        root.append(card);
      });
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  get("#finance-filter")?.addEventListener("submit", (event) => {
    event.preventDefault();
    loadFinance();
  });
  get("#finance-export")?.addEventListener("click", async () => {
    try {
      const response = await fetchJson("/api/admin/finance/export.csv");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = element("a");
      link.href = url;
      link.download = "nlqi-payments.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  async function loadAudit() {
    try {
      const params = new URLSearchParams();
      const action = get("#audit-action").value.trim();
      const actor = get("#audit-actor").value.trim();
      if (action) params.set("action", action);
      if (actor) params.set("actor", actor);
      const data = await fetchJson(`/api/admin/audit-logs?${params}`);
      const root = get("#audit-list");
      root.replaceChildren();
      if (!data.logs.length) {
        root.append(element("p", "analytics-empty", "No audit events match these filters."));
        return;
      }
      data.logs.forEach((log) => {
        const card = element("article", "admin-app-card");
        const heading = element("div", "admin-app-heading");
        heading.append(element("h3", "", log.action), element("span", "", new Date(log.createdAt).toLocaleString()));
        const actor = log.actorName ? `${log.actorName} (${log.actorEmail})` : "System";
        card.append(heading, element("p", "", `${actor} · ${log.entityType || "event"}${log.entityId ? ` #${log.entityId}` : ""}`));
        if (log.details && Object.keys(log.details).length) {
          const details = document.createElement("details");
          details.append(element("summary", "", "Event details"));
          const pre = element("pre", "audit-details", JSON.stringify(log.details, null, 2));
          details.append(pre);
          card.append(details);
        }
        root.append(card);
      });
      setStatus(`${data.total} audit event${data.total === 1 ? "" : "s"} total. Showing page ${data.page}.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  get("#audit-filter")?.addEventListener("submit", (event) => {
    event.preventDefault();
    loadAudit();
  });

  async function loadSettings() {
    try {
      const data = await fetchJson("/api/admin/settings");
      const rows = [
        ["Environment", data.environment],
        ["Public URL", data.appUrl],
        ["Database", data.database],
        ["Email delivery", data.email.configured ? "Configured" : "Not configured"],
        ["Contact recipient", data.contactEmailConfigured ? "Configured" : "Not configured"],
        ["Paystack", data.payments.configured ? "Configured" : "Not configured"],
        ["Currency", data.payments.currency],
        ["Application fee", `${data.payments.currency} ${Number(data.payments.applicationFee).toLocaleString()}`],
        ["Session lifetime", `${data.sessions.lifetimeDays} days`],
        ["Secure cookies", data.sessions.secureCookies ? "Enabled" : "Disabled (local HTTP)" ],
        ["Maximum upload", `${data.uploadLimitMb} MB per file`],
        ["Configuration source", data.configurationSource],
      ];
      const root = get("#settings-list");
      root.replaceChildren();
      rows.forEach(([label, value]) => {
        const item = element("article", "setting-item");
        item.append(element("small", "", label), element("strong", "", value));
        root.append(item);
      });
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  renderContentForm();
})();
