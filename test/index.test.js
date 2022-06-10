/* eslint-disable no-underscore-dangle */
const vite = require("vite");
const path = require("path");
const middie = require("middie");

const ssrPlugin = require("../index");

let fastifyInstance;
let testOptions;
let done;
let mockViteServer;
let mockRenderModule;

jest.mock("vite", () => ({
  createServer: jest.fn(),
}));

jest.mock("path", () => ({
  resolve: jest.fn(),
}));

describe("./index.js", () => {
  beforeEach(() => {
    fastifyInstance = {
      get: jest.fn(),
      register: jest.fn(),
      use: jest.fn(),
    };

    testOptions = {
      renderPath: "./test/render.js",
      readTemplate: jest.fn(),
      populateTemplate: jest.fn(),
      production: false,
      root: "",
    };

    mockRenderModule = {
      render: jest.fn(),
    };

    mockViteServer = {
      middlewares: "middlewares",
      ssrLoadModule: jest.fn().mockResolvedValue(mockRenderModule),
      transformIndexHtml: jest.fn(),
    };

    done = jest.fn();

    path.resolve.mockImplementation((s) => s);
    vite.createServer.mockResolvedValue(mockViteServer);
  });
  describe("When ssr plugin is registered", () => {
    beforeEach(async () => {
      await ssrPlugin(fastifyInstance, testOptions, done);
    });
    describe("and when production option is set", () => {
      beforeEach(async () => {
        testOptions = {
          ...testOptions,
          renderpath: "./test/render.js",
          production: true,
        };
        // reset so that only last ssrPlugin call is being considered
        jest.clearAllMocks();
        await ssrPlugin(fastifyInstance, testOptions, done);
      });

      it("then vite createServer should not be called", () => {
        expect(vite.createServer).not.toHaveBeenCalled();
      });

      it("then it should register ssrHandler", () => {
        const expected = ["**", expect.any(Function)];
        expect(fastifyInstance.get).toHaveBeenCalledWith(...expected);
      });

      it("then done should be called", () => {
        expect(done).toHaveBeenCalled();
      });
    });

    it("then it should call vite createServer with correct options", () => {
      expect(vite.createServer).toHaveBeenCalledWith({
        root: testOptions.root,
        logLevel: "info",
        server: {
          middlewareMode: "ssr",
        },
      });
    });

    it("then it should call fastify register for middie plugin", () => {
      expect(fastifyInstance.register).toHaveBeenCalledWith(middie);
    });

    it("then it should call fastify.use for vite middlewares", () => {
      expect(fastifyInstance.use).toHaveBeenCalledWith(
        mockViteServer.middlewares
      );
    });

    it("then it should call vite's ssrLoadModule", () => {
      expect(mockViteServer.ssrLoadModule).toHaveBeenCalledWith(
        testOptions.renderPath
      );
    });

    it("then it should register ssrHandler", () => {
      const expected = ["**", expect.any(Function)];
      expect(fastifyInstance.get).toHaveBeenCalledWith(...expected);
    });

    it("then done should be called", () => {
      expect(done).toHaveBeenCalled();
    });

    describe("and when render module has default property", () => {
      beforeEach(async () => {
        mockRenderModule = {
          default: { render: jest.fn() },
        };

        mockViteServer.ssrLoadModule.mockResolvedValue(mockRenderModule);
        // reset so that only last ssrPlugin call is being considered
        jest.clearAllMocks();
        await ssrPlugin(fastifyInstance, testOptions, done);
      });
      it("then done should be called", () => {
        expect(done).toHaveBeenCalled();
      });
    });
  });

  describe("When ssrHandler is called", () => {
    let ssrHandler;
    let mockReq;
    let mockReply;
    const url = "/this/is/a/url";
    beforeEach(() => {
      mockReq = {
        raw: {
          url,
        },
      };
      mockReply = {
        _type: null,
        _res: null,
        type(t) {
          this._type = t;
          return this;
        },
        send(response) {
          this._res = response;
        },
      };
    });
    describe("and when production option is set", () => {
      beforeEach(async () => {
        testOptions = {
          ...testOptions,
          renderpath: "./test/render.js",
          production: true,
        };

        testOptions.readTemplate.mockReturnValue("template");
        testOptions.populateTemplate.mockReturnValue("populated template");

        fastifyInstance.get = (...args) => {
          [, ssrHandler] = args;
        };
        await ssrPlugin(fastifyInstance, testOptions, done);
        await ssrHandler(mockReq, mockReply);
      });

      it("then it should call user provided populateTemplate with correct arguments", () => {
        expect(testOptions.populateTemplate).toHaveBeenCalledWith(
          "template",
          expect.any(Function),
          url
        );
      });
      it('then it should call reply.type with "text/html"', () => {
        expect(mockReply._type).toBe("text/html");
      });
      it("reply.send with populated template", () => {
        expect(mockReply._res).toBe("populated template");
      });
    });
    describe("and when production option is false", () => {
      beforeEach(async () => {
        testOptions = {
          ...testOptions,
          renderpath: "./test/render.js",
          production: false,
        };

        testOptions.readTemplate.mockReturnValue("template");
        testOptions.populateTemplate.mockResolvedValue("populated template");
        mockViteServer.transformIndexHtml.mockResolvedValue("vite template");
        fastifyInstance.get = (...args) => {
          [, ssrHandler] = args;
        };
        await ssrPlugin(fastifyInstance, testOptions, done);
        await ssrHandler(mockReq, mockReply);
      });

      it("then it should call vite's transformIndexHtml", () => {
        expect(mockViteServer.transformIndexHtml).toHaveBeenCalledWith(
          url,
          "template"
        );
      });

      it("then it should call user provided populateTemplate with correct arguments", () => {
        expect(testOptions.populateTemplate).toHaveBeenCalledWith(
          "vite template",
          expect.any(Function),
          url
        );
      });
      it('then it should call reply.type with "text/html"', () => {
        expect(mockReply._type).toBe("text/html");
      });
      it("reply.send with populated template", () => {
        expect(mockReply._res).toBe("populated template");
      });
    });
  });
});
