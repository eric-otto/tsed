import {
  BeforeRoutesInit,
  Configuration,
  Inject,
  InjectorService,
  Module,
  OnReady,
  PlatformApplication,
  PlatformContext,
  PlatformRouter,
  useCtxHandler
} from "@tsed/common";
import Fs from "fs";
import {join} from "path";
import {SwaggerSettings} from "./interfaces";
import {cssMiddleware} from "./middlewares/cssMiddleware";
import {indexMiddleware} from "./middlewares/indexMiddleware";
import {jsMiddleware} from "./middlewares/jsMiddleware";
import {redirectMiddleware} from "./middlewares/redirectMiddleware";
import {SwaggerService} from "./services/SwaggerService";

const swaggerUiPath = require("swagger-ui-dist").absolutePath();

/**
 * @ignore
 */
@Module()
export class SwaggerModule implements BeforeRoutesInit, OnReady {
  @Inject()
  injector: InjectorService;

  @Inject()
  app: PlatformApplication;

  @Configuration()
  configuration: Configuration;

  @Inject()
  swaggerService: SwaggerService;

  private loaded = false;

  get settings() {
    return ([] as SwaggerSettings[]).concat(this.configuration.get<SwaggerSettings[]>("swagger")).filter((o) => !!o);
  }

  /**
   *
   */
  $beforeRoutesInit() {
    if (this.loaded) {
      return;
    }

    const urls: any[] = this.getUrls();

    this.settings.forEach((conf: SwaggerSettings) => {
      const {path = "/"} = conf;

      this.app.get(path, useCtxHandler(redirectMiddleware(path)));
      this.app.use(path, this.createRouter(conf, urls));
    });

    this.loaded = true;
  }

  $onRoutesInit() {
    this.settings.forEach((conf) => {
      const {outFile} = conf;
      const spec = this.swaggerService.getOpenAPISpec(conf);

      if (outFile) {
        Fs.writeFileSync(outFile, JSON.stringify(spec, null, 2));
      }
    });
  }

  $onReady() {
    const {configuration, injector} = this;
    const {httpsPort, httpPort} = configuration;

    const displayLog = (host: any) => {
      this.settings.forEach((conf) => {
        const {path = "/", doc} = conf;
        const url = typeof host.port === "number" ? `${host.protocol}://${host.address}:${host.port}` : "";

        injector.logger.info(`[${doc || "default"}] Swagger JSON is available on ${url}${path}/swagger.json`);
        injector.logger.info(`[${doc || "default"}] Swagger UI is available on ${url}${path}/`);
      });
    };

    if (httpsPort) {
      const host = configuration.getHttpsPort();
      displayLog({protocol: "https", ...host});
    } else if (httpPort) {
      const host = configuration.getHttpPort();
      displayLog({protocol: "http", ...host});
    }
  }

  private getUrls() {
    return this.settings.reduce((acc: any[], conf) => {
      const {path = "/", fileName = "swagger.json", doc, hidden} = conf;
      if (!hidden) {
        acc.push({url: `${path}/${fileName}`, name: doc || path});
      }

      return acc;
    }, []);
  }

  /**
   *
   * @param conf
   * @param urls
   */
  private createRouter(conf: SwaggerSettings, urls: string[]) {
    const {cssPath, jsPath, viewPath = join(__dirname, "../views/index.ejs")} = conf;
    const router = PlatformRouter.create(this.injector);

    router.get("/swagger.json", useCtxHandler(this.middlewareSwaggerJson(conf)));

    if (viewPath) {
      if (cssPath) {
        router.get("/main.css", useCtxHandler(cssMiddleware(cssPath)));
      }

      if (jsPath) {
        router.get("/main.js", useCtxHandler(jsMiddleware(jsPath)));
      }

      router.get("/", useCtxHandler(indexMiddleware(viewPath, {urls, ...conf})));
      router.statics("/", {root: swaggerUiPath});
    }

    return router;
  }

  private middlewareSwaggerJson(conf: SwaggerSettings) {
    return (ctx: PlatformContext) => {
      ctx.response.status(200).body(this.swaggerService.getOpenAPISpec(conf));
    };
  }
}
