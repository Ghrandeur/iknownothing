(() => {
  const api = window.nlqiApi;
  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const galleryRoot = document.querySelector("#gallery-items");
  if (galleryRoot) {
    api.request("/api/content/gallery").then(({ items }) => {
      galleryRoot.replaceChildren();
      if (!items.length) galleryRoot.append(create("p", "content-empty", "Gallery stories and moments will appear here."));
      items.forEach((item) => {
        const card = create("article", "content-card");
        const image = create("img");
        image.src = item.imageUrl;
        image.alt = item.title;
        image.loading = "lazy";
        card.append(image, create("h2", "", item.title));
        if (item.description) card.append(create("p", "", item.description));
        galleryRoot.append(card);
      });
    }).catch((error) => { galleryRoot.textContent = error.message; });
  }

  const blogRoot = document.querySelector("#blog-items");
  const postRoot = document.querySelector("#blog-post");
  if (blogRoot) {
    api.request("/api/content/blog").then(({ items }) => {
      blogRoot.replaceChildren();
      if (!items.length) blogRoot.append(create("p", "content-empty", "NLQI stories and updates will appear here."));
      items.forEach((item) => {
        const card = create("article", "content-card");
        if (item.imageUrl) {
          const image = create("img");
          image.src = item.imageUrl;
          image.alt = "";
          image.loading = "lazy";
          card.append(image);
        }
        card.append(create("p", "section-tag", "NLQI JOURNAL"), create("h2", "", item.title));
        if (item.excerpt) card.append(create("p", "", item.excerpt));
        const link = create("a", "text-link", "Read story ↗");
        link.href = `/blog-post?slug=${encodeURIComponent(item.slug)}`;
        card.append(link);
        blogRoot.append(card);
      });
    }).catch((error) => { blogRoot.textContent = error.message; });
  }

  if (postRoot) {
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) {
      postRoot.textContent = "Article not found.";
    } else {
      api.request(`/api/content/blog/${encodeURIComponent(slug)}`).then(({ post }) => {
        document.title = `${post.title} — NLQI`;
        postRoot.replaceChildren();
        if (post.imageUrl) {
          const image = create("img", "content-hero-image");
          image.src = post.imageUrl;
          image.alt = "";
          postRoot.append(image);
        }
        postRoot.append(create("p", "section-tag", "NLQI JOURNAL"), create("h1", "", post.title));
        if (post.excerpt) postRoot.append(create("p", "content-lede", post.excerpt));
        const body = create("div", "blog-body");
        post.body.split(/\n{2,}/).filter(Boolean).forEach((paragraph) => body.append(create("p", "", paragraph)));
        postRoot.append(body);
      }).catch((error) => { postRoot.textContent = error.message; });
    }
  }

  const sponsors = document.querySelector("#sponsors-section");
  const sponsorRoot = document.querySelector("#sponsors-track");
  if (sponsors && sponsorRoot) {
    Promise.all([
      api.request("/api/content/sponsors"),
      api.request("/api/content/partners"),
    ]).then(([sponsorsResult, partnersResult]) => {
      const items = [...sponsorsResult.items, ...partnersResult.items];
      if (!items.length) return;
      sponsors.hidden = false;
      items.forEach((item) => {
        const card = create("a", "sponsor-item");
        if (item.websiteUrl) {
          card.href = item.websiteUrl;
          card.target = "_blank";
          card.rel = "noopener noreferrer";
        }
        if (item.logoUrl) {
          const image = create("img");
          image.src = item.logoUrl;
          image.alt = `${item.name} logo`;
          card.append(image);
        } else {
          card.append(create("strong", "", item.name));
        }
        sponsorRoot.append(card);
      });
    }).catch((error) => { console.error("Unable to load NLQI partners:", error.message); });
  }
})();
