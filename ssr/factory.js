const ssrFactory = async (render, template, populateTemplate, vite) => {
  let ssrHandler;
  if (vite) {
    ssrHandler = async function ssr(req, reply) {
      const viteTemplate = await vite.transformIndexHtml(req.raw.url, template);
      const response = await populateTemplate(
        viteTemplate,
        render,
        req.raw.url
      );
      reply.type("text/html").send(response);
    };
  } else {
    ssrHandler = async function ssr(req, reply) {
      const response = await populateTemplate(template, render, req.raw.url);
      reply.type("text/html").send(response);
    };
  }

  return ssrHandler;
};

module.exports = ssrFactory;
