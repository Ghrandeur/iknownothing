(() => {
  const form = document.querySelector("#contact-form");
  if (!form) return;
  const feedback = document.querySelector("#contact-feedback");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    window.nlqiApi.displayMessage(feedback, "");
    try {
      const result = await window.nlqiApi.request("/api/contact", {
        method: "POST",
        body: {
          name: fields.get("name"),
          email: fields.get("email"),
          message: fields.get("message"),
        },
      });
      window.nlqiApi.displayMessage(feedback, result.message);
      form.reset();
    } catch (error) {
      window.nlqiApi.displayMessage(feedback, error.message, true);
    } finally {
      button.disabled = false;
    }
  });
})();
