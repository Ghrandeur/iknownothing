const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-nav");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    navigation.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      navigation.classList.remove("open");
      document.body.classList.remove("menu-open");
    });
  });

  document.addEventListener("click", (event) => {
    if (
      navigation.classList.contains("open") &&
      !navigation.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      navigation.classList.remove("open");
      document.body.classList.remove("menu-open");
    }
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());

const programmeTrack = document.querySelector("#programme-track");
const progressThumb = document.querySelector(".slider-progress span");
const updateProgrammeProgress = () => {
  if (!programmeTrack || !progressThumb) return;
  const maxScroll = programmeTrack.scrollWidth - programmeTrack.clientWidth;
  const visibleRatio = programmeTrack.clientWidth / programmeTrack.scrollWidth;
  const progress = maxScroll > 0 ? programmeTrack.scrollLeft / maxScroll : 0;
  progressThumb.style.width = `${Math.max(visibleRatio * 100, 20)}%`;
  progressThumb.style.transform = `translateX(${progress * (100 / Math.max(visibleRatio, 0.2))}%)`;
};

if (programmeTrack) {
  document.querySelectorAll("[data-slide]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.slide === "next" ? 1 : -1;
      programmeTrack.scrollBy({ left: direction * programmeTrack.clientWidth * 0.72, behavior: "smooth" });
    });
  });
  programmeTrack.addEventListener("scroll", updateProgrammeProgress, { passive: true });
  window.addEventListener("resize", updateProgrammeProgress);
  updateProgrammeProgress();
}

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

document.querySelectorAll("[data-count]").forEach((counter) => {
  const finish = Number(counter.dataset.count);
  const suffix = counter.dataset.suffix || "";
  if (!Number.isFinite(finish)) return;

  const animateCount = () => {
    const start = performance.now();
    const duration = 1000;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      counter.textContent = `${Math.round(finish * eased).toLocaleString()}${progress === 1 ? suffix : ""}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          animateCount();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(counter);
  } else {
    animateCount();
  }
});

const applicationForm = document.querySelector("#application-form");
if (applicationForm) {
  const steps = [...applicationForm.querySelectorAll(".form-step")];
  const labels = [...document.querySelectorAll(".step-label")];
  const currentStepLabel = document.querySelector("#current-step");
  const progressBar = document.querySelector("#step-progress");
  const progressFill = document.querySelector("#step-progress-fill");
  const progressTrack = document.querySelector(".progress-track");
  const feedback = document.querySelector("#form-feedback");
  const accountGate = document.querySelector("#apply-auth-gate");
  const accountMessage = document.querySelector("#apply-account");
  const applicationCard = document.querySelector(".application-card");
  let applicant = null;
  let currentStep = 0;

  const showFeedback = (message, error = false) => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.add("show");
    feedback.classList.toggle("error", error);
  };

  const showStep = (index) => {
    currentStep = index;
    steps.forEach((step, stepIndex) => step.classList.toggle("active", stepIndex === index));
    labels.forEach((label, labelIndex) => {
      label.classList.toggle("active", labelIndex === index);
      label.classList.toggle("complete", labelIndex < index);
      label.disabled = labelIndex > index;
      if (labelIndex === index) label.setAttribute("aria-current", "step");
      else label.removeAttribute("aria-current");
    });
    const completion = Math.round(((index + 1) / steps.length) * 100);
    if (currentStepLabel) currentStepLabel.textContent = String(index + 1).padStart(2, "0");
    if (progressBar) progressBar.textContent = `${completion}% complete`;
    if (progressFill) progressFill.style.width = `${completion}%`;
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(completion));
    if (feedback) feedback.classList.remove("show");
    applicationForm.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  labels.forEach((label, index) => {
    label.addEventListener("click", () => {
      if (index < currentStep) showStep(index);
    });
  });

  applicationForm.querySelectorAll("textarea").forEach((textarea) => {
    const counter = document.createElement("span");
    counter.className = "character-count";
    counter.textContent = `${textarea.value.length} characters`;
    textarea.addEventListener("input", () => {
      counter.textContent = `${textarea.value.length} characters`;
    });
    textarea.closest(".form-field")?.append(counter);
  });

  const uploadLimit = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) ? 5 : 1;
  applicationForm.querySelectorAll("[data-upload-card]").forEach((card) => {
    const input = card.querySelector('input[type="file"]');
    const selected = card.querySelector(".upload-selected");
    if (!input || !selected) return;
    const hint = card.querySelector(".upload-hint");
    if (hint) hint.textContent += ` · up to ${uploadLimit} MB`;
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("dragging");
    });
    card.addEventListener("dragleave", (event) => {
      if (!card.contains(event.relatedTarget)) card.classList.remove("dragging");
    });
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("dragging");
      const [file] = event.dataTransfer?.files || [];
      if (!file) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    input.addEventListener("change", () => {
      const [file] = input.files || [];
      if (!file) {
        card.classList.remove("has-file", "invalid-file");
        selected.textContent = "Choose a file or drop it here";
        return;
      }
      if (file.size > uploadLimit * 1024 * 1024) {
        input.value = "";
        card.classList.remove("has-file");
        card.classList.add("invalid-file");
        selected.textContent = `This file is too large. Choose a file up to ${uploadLimit} MB.`;
        showFeedback(`Each file must be ${uploadLimit} MB or smaller.`, true);
        return;
      }
      card.classList.remove("invalid-file");
      card.classList.add("has-file");
      selected.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          let preview = card.querySelector(".upload-preview");
          if (!preview) {
            preview = document.createElement("img");
            preview.className = "upload-preview";
            preview.alt = "";
            card.prepend(preview);
          }
          preview.src = String(reader.result);
        });
        reader.readAsDataURL(file);
      } else {
        card.querySelector(".upload-preview")?.remove();
      }
    });
  });

  const makeRequestBody = () => {
    const formData = new FormData(applicationForm);
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File || key === "termsAgreed") continue;
      data[key] = value;
    }
    const requestBody = new FormData();
    requestBody.set("data", JSON.stringify(data));
    requestBody.set("currentStep", String(currentStep + 1));
    requestBody.set("termsAgreed", applicationForm.elements.termsAgreed.checked ? "true" : "false");
    for (const field of ["headshot", "fullBody", "identityDocument"]) {
      const file = applicationForm.elements[field].files[0];
      if (file) requestBody.set(field, file);
    }
    return requestBody;
  };

  const saveDraft = async () => {
    try {
      const result = await window.nlqiApi.request("/api/applications/me", {
        method: "PUT",
        body: makeRequestBody(),
      });
      showFeedback(`Draft saved · ${result.applicationNumber}`);
      return true;
    } catch (error) {
      showFeedback(error.message, true);
      return false;
    }
  };

  applicationForm.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", async () => {
      const fields = [...steps[currentStep].querySelectorAll("input, select, textarea")];
      const firstInvalid = fields.find((field) => !field.reportValidity());
      if (firstInvalid) return;
      if (!(await saveDraft())) return;
      showStep(Math.min(currentStep + 1, steps.length - 1));
    });
  });

  applicationForm.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showStep(Math.max(currentStep - 1, 0)));
  });

  document.querySelector("#save-draft")?.addEventListener("click", saveDraft);

  applicationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalidStep = steps.findIndex((step) =>
    [...step.querySelectorAll("input, select, textarea")].some((field) => !field.checkValidity()),
    );
    if (invalidStep !== -1) {
    showStep(invalidStep);
    const invalidField = [...steps[invalidStep].querySelectorAll("input, select, textarea")]
      .find((field) => !field.checkValidity());
    invalidField?.reportValidity();
    return;
    }
    if (!applicationForm.elements.termsAgreed.checked) {
    applicationForm.elements.termsAgreed.reportValidity();
    return;
    }
    const submit = applicationForm.querySelector('[type="submit"]');
    submit.disabled = true;
    window.nlqiApi.request("/api/applications/me/submit", {
    method: "POST",
    body: makeRequestBody(),
    }).then(async (result) => {
      applicationForm.hidden = true;
      accountMessage.hidden = false;
      const emailNote = result.emailStatus === "development-console"
        ? " The email notification was printed in the server console because this is local development."
        : result.emailStatus === "failed"
          ? " Your application was submitted, but the notification email could not be delivered."
          : "";
      accountMessage.textContent = `${result.message} Your reference is ${result.application.applicationNumber}.${emailNote}`;
      try {
        const checkout = await window.nlqiApi.request("/api/payments/initialize", {
          method: "POST",
          body: {},
        });
        window.location.assign(checkout.authorizationUrl);
      } catch (error) {
        console.error("Application submitted, but payment checkout could not start:", error.message);
        window.location.assign("/track?checkout=unavailable");
      }
    }).catch((error) => showFeedback(error.message, true))
    .finally(() => { submit.disabled = false; });
  });

  window.nlqiApi.request("/api/auth/me").then(async (result) => {
    applicant = result.user;
    if (!result.user.emailVerified) {
    const heading = document.createElement("strong");
    heading.textContent = "Verify your email to continue.";
    const message = document.createElement("p");
    message.textContent = `We sent a verification link to ${result.user.email}.`;
    const resend = document.createElement("button");
    resend.type = "button";
    resend.className = "button button-dark";
    resend.textContent = "Resend verification email";
    accountGate.replaceChildren(heading, message, resend);
    resend.addEventListener("click", async () => {
      try {
        const sent = await window.nlqiApi.request("/api/auth/resend-verification", {
          method: "POST",
          body: { email: result.user.email },
        });
        message.textContent = sent.message;
      } catch (error) {
        message.textContent = error.message;
      }
    });
    accountGate.hidden = false;
    applicationCard.hidden = true;
    return;
    }
    accountGate.hidden = true;
    accountMessage.hidden = false;
    accountMessage.textContent = `Signed in as ${result.user.email}. Your application reference is ${result.application?.application_number || "being prepared"}.`;
    if (result.application && result.application.status !== "draft") {
    applicationCard.hidden = true;
    accountMessage.textContent = `Your application ${result.application.application_number} has been submitted and is ${result.application.status}. View updates in your applicant portal.`;
    const trackLink = document.createElement("a");
    trackLink.href = "/track";
    trackLink.textContent = " Open applicant portal";
    accountMessage.append(trackLink);
    return;
    }
    applicationCard.hidden = false;
    const saved = await window.nlqiApi.request("/api/applications/me");
    for (const [key, value] of Object.entries(saved.application.data || {})) {
    const field = applicationForm.elements.namedItem(key);
    if (field && field.type !== "file" && key !== "termsAgreed") field.value = value;
    }
    if (saved.application.currentStep > 1) showStep(Math.min(saved.application.currentStep - 1, steps.length - 1));
  }).catch((error) => {
    accountGate.hidden = false;
    applicationCard.hidden = true;
    if (error.message.includes("verify")) {
    accountGate.innerHTML = `<strong>Verify your email to continue.</strong><p>${error.message}</p><a href="/login" class="text-link">Sign in again</a>`;
    }
  });
}
