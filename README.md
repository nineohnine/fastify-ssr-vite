[![Node.js CI](https://github.com/nineohnine/fastify-ssr-vite/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/nineohnine/fastify-ssr-vite/actions/workflows/ci.yml)

# fastify-ssr-vite

A fastify plugin for vite ssr setup. This plugin decorates the fastify reply object with an `ssr` method that can be used render and send a html response.

For information about configuring vite please see [vite's documentation](https://vitejs.dev/).

## The Reply Decorator

When called the function will render your application using your supplied configuration to read and populate your template.

By default the decorator will not automatically send your response:

```js
app.get("/", async (req, reply) => {
  // some pre rendering logic
  const resp = await reply.ssr(false);
  // do some stuff with response after render
  reply.type("text/html").send(resp);
});
```

You can enable this behavior by passing a `true` value as it's only parameter like so:

```js
app.get("/", async (req, reply) => {
  await reply.ssr(true);
});
```

> note: the decorator will also set response type to "text/html"

## Usage

```js
import ssr from "fastify-ssr-vite";

const readTemplate = (root) => {
  ...
}

const populateTemplate = async () => {
  ...
}

const root = process.cwd();

app.register(ssr, {
  production: false,
  renderPath: "./src/render.jsx",
  readTemplate,
  populateTemplate,
  root,
});

app.get("**", async (req, reply) => {
  const resp = await reply.ssr();
});
```

## Configuration

The fastify-ssr-vite plugin requires the following configuration:

```js
fastify.register(require("fastify-ssr-vite"), {
  production: false,
  renderPath: "./src/render.jsx",
  readTemplate,
  populateTemplate,
  root,
});
```

- `production`: determines whether or not to register vite middleware.
- `renderPath:` the path to the render function / entry point to application.
- `readTemplate(root)`: synchronous function called by plugin and expects the template string as return value — called with single parameter `root` option. The template string will be passed as a parameter to user supplied `populateTemplate` function option.

example:

```js
const readTemplate = () => {
  const templatePath = path.join(__dirname, "./templates/index.hbs");
  const source = fs.readFileSync(templatePath, { encoding: "utf8" });
  return source;
};
```

- `populateTemplate(template, render, url)`: asynchronous function called by the ssr reply decorator. It is called with 3 parameters: `template: string`, `render: function`, `url: string` (note: url is the value of Fastify's request object's property [`raw.url`]('https://www.fastify.io/docs/latest/Reference/Request/')). The expected return value is the fully rendered `string` response (template w/ rendered application).

example:

```js
const populateTemplate = async (template, render, url) => {
  let t = handlebars.compile(template);
  const { html, serverState } = await render(url);
  const state = JSON.stringify(serverState).replace(/</g, "\\u003c");
  return t({ html, state });
};
```

- `root`: root directory of your application, used by vite to load files and passed as parameter to `readTemplate` call. Assuming server entry is at the root of your application project folder, `process.cwd()` should suffice.
