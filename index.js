const path = require("path");
const fp = require("fastify-plugin");
const vite = require("vite");
const middie = require("@fastify/middie");
const ssrFactory = require("./ssr");

const { createServer } = vite;

// handle esm vs. commonjs mods
const returnRender = (m) => (m.default ? m.default.render : m.render);

async function ssr(fastify, opts, done) {
  const { renderPath, readTemplate, populateTemplate, production, root } = {
    ...opts,
  };

  const template = readTemplate(root);

  let render;
  let renderMod;
  let viteServer;
  if (production) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    renderMod = require(path.resolve(renderPath));
    render = returnRender(renderMod);
  } else {
    // dev server magic
    viteServer = await createServer({
      root,
      logLevel: "info",
      server: {
        middlewareMode: "ssr",
      },
    });

    await fastify.register(middie);

    fastify.use(viteServer.middlewares);

    renderMod = await viteServer.ssrLoadModule(path.resolve(renderPath));
    render = returnRender(renderMod);
  }

  const ssrDecorator = await ssrFactory(
    render,
    template,
    populateTemplate,
    viteServer
  );

  fastify.decorateReply("ssr", ssrDecorator);

  done();
}

module.exports = fp(ssr);
