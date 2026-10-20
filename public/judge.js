(() => {
  const api = window.nlqiApi;
  const root = document.querySelector("#judge-assignments");
  if (!root) return;
  const status = document.querySelector("#judge-message");

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  async function loadAssignments() {
    try {
      const { assignments, criteria } = await api.request("/api/judge/assignments");
      root.replaceChildren();
      if (!assignments.length) {
        root.append(element("article", "application-card portal-card", "No applications are assigned to you yet."));
        return;
      }
      assignments.forEach((application) => {
        const card = element("article", "application-card portal-card judge-card");
        const firstName = application.data.firstName || "";
        const lastName = application.data.lastName || "";
        card.append(
          element("h2", "", `${firstName} ${lastName}`.trim() || "Applicant"),
          element("p", "", application.applicationNumber),
        );
        const details = document.createElement("details");
        const summary = element("summary", "", "Review application answers");
        const answers = document.createElement("dl");
        Object.entries(application.data).forEach(([label, value]) => {
          answers.append(element("dt", "", label), element("dd", "", String(value)));
        });
        details.append(summary, answers);
        const form = document.createElement("form");
        form.className = "judge-score-form";
        form.dataset.applicationId = application.applicationId;
        const existing = new Map(application.criteria.map((item) => [item.criterion, item]));
        const comments = {};
        criteria.forEach((criterion) => {
          const wrapper = element("div", "judge-criterion");
          const label = element("label", "form-field", `${criterion[0].toUpperCase()}${criterion.slice(1)} · score 1–10`);
          const score = document.createElement("input");
          score.type = "number";
          score.name = criterion;
          score.min = "1";
          score.max = "10";
          score.step = "1";
          score.required = true;
          score.value = existing.get(criterion)?.score ?? "";
          label.append(score);
          const commentLabel = element("label", "form-field", "Optional note");
          const comment = document.createElement("textarea");
          comment.name = `${criterion}Comment`;
          comment.maxLength = 1000;
          comment.rows = 2;
          comment.value = existing.get(criterion)?.comment || "";
          commentLabel.append(comment);
          wrapper.append(label, commentLabel);
          form.append(wrapper);
        });
        const save = element("button", "button button-dark", application.scored ? "Update scores" : "Save scores");
        save.type = "submit";
        form.append(save);
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (!form.reportValidity()) return;
          const values = new FormData(form);
          const scores = {};
          criteria.forEach((criterion) => {
            scores[criterion] = Number(values.get(criterion));
            comments[criterion] = values.get(`${criterion}Comment`);
          });
          try {
            const result = await api.request(`/api/judge/assignments/${application.applicationId}/scores`, {
              method: "PUT",
              body: { scores, comments },
            });
            status.textContent = result.message;
            await loadAssignments();
          } catch (error) {
            status.textContent = error.message;
          }
        });
        card.append(details, form);
        root.append(card);
      });
    } catch (error) {
      status.textContent = error.message;
      if (error.message.includes("sign in") || error.message.includes("Judge access")) window.location.href = "/login";
    }
  }

  loadAssignments();
  document.querySelector("#judge-logout")?.addEventListener("click", async () => {
    try {
      await api.request("/api/auth/logout", { method: "POST", body: {} });
      window.location.href = "/login";
    } catch (error) {
      status.textContent = error.message;
    }
  });
})();
