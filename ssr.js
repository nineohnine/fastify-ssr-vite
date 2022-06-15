const ssrFactory = async (render, template, populateTemplate, vite) => {
  let ssrDecorator;
  if (vite) {
    ssrDecorator = async function ssr(send = true) {
      const viteTemplate = await vite.transformIndexHtml(
        this.request.raw.url,
        template
      );

      const response = await populateTemplate(
        viteTemplate,
        render,
        this.request.raw.url
      );

      this.type("text/html");
      if (send) this.send(response);

      return response;
    };
  } else {
    ssrDecorator = async function ssr(send = true) {
      const response = await populateTemplate(
        template,
        render,
        this.request.raw.url
      );

      this.type("text/html");
      if (send) this.send(response);

      return response;
    };
  }

  return ssrDecorator;
};

module.exports = ssrFactory;
