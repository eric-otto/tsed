import {Env, setValue} from "@tsed/core";
import {Constant, Inject, Injectable, InjectorService} from "@tsed/di";
import Provider from "oidc-provider";
import RawOIDCProvider, {ClientMetadata, Configuration, interactionPolicy} from "oidc-provider";
import {INTERACTIONS} from "../constants";
import {OidcAccountsMethods, OidcClientsMethods, OidcSettings} from "../domain";
import {OidcAdapters} from "./OidcAdapters";
import {OidcInteractions} from "./OidcInteractions";
import {OidcJwks} from "./OidcJwks";

@Injectable()
export class OidcProvider {
  raw: RawOIDCProvider;

  @Constant("env")
  protected env: Env;

  @Constant("httpPort")
  protected httpPort: number | string;

  @Constant("httpsPort")
  protected httpsPort: number | string;

  @Constant("oidc.issuer", "")
  protected issuer: string;

  @Constant("oidc.clients", "")
  protected staticClients: ClientMetadata[];

  @Constant("oidc.secureKey")
  protected secureKey: string[];

  @Constant("oidc.proxy", false)
  protected proxy: boolean;

  @Constant("oidc.options", {})
  protected options: Configuration;

  @Constant("oidc")
  protected oidc: OidcSettings;

  @Inject()
  protected oidcJwks: OidcJwks;

  @Inject()
  protected oidcInteractions: OidcInteractions;

  @Inject()
  protected adapters: OidcAdapters;

  @Inject()
  protected injector: InjectorService;

  hasConfiguration() {
    return !!this.oidc;
  }

  async getConfiguration(): Promise<Configuration> {
    const [jwks, adapter] = await Promise.all([this.oidcJwks.getJwks(), this.adapters.createAdapterClass()]);

    const configuration: Configuration = {
      ...this.options,
      adapter,
      jwks,
      clients: this.staticClients
    };

    if (this.oidc.Accounts) {
      configuration.findAccount = (ctx, id, token) =>
        this.injector.get<OidcAccountsMethods>(this.oidc.Accounts)!.findAccount(id, token, (ctx.req as any).$ctx);
    }

    if (this.env === Env.PROD) {
      setValue(configuration, "cookies.short.secure", true);
      setValue(configuration, "cookies.long.secure", true);
    }

    const policy = this.getPolicy();
    if (policy) {
      setValue(configuration, "interactions.policy", policy);
    }

    const url = this.getInteractionsUrl();
    if (url) {
      setValue(configuration, "interactions.url", url);
    }

    return configuration;
  }

  getIssuer() {
    if (this.issuer) {
      return this.issuer;
    }

    if (this.httpsPort) {
      return `https://localhost:${this.httpsPort}`;
    }

    return `http://localhost:${this.httpPort}`;
  }

  get(): Provider {
    return this.raw;
  }

  /**
   * Create a new instance of OidcProvider
   */
  async create(): Promise<void | Provider> {
    const configuration = await this.getConfiguration();
    const oidcProvider = new RawOIDCProvider(this.getIssuer(), configuration);

    if (this.oidc.Clients) {
      oidcProvider.Client.find = (id: string) => this.injector.get<OidcClientsMethods>(this.oidc.Clients)!.find(id);
    }

    if (this.proxy || this.env === Env.PROD) {
      oidcProvider.proxy = true;
    }

    if (this.secureKey) {
      oidcProvider.keys = this.secureKey;
    }

    this.raw = oidcProvider;

    if (this.env !== Env.PROD) {
      this.allowHttpLocalhost();
    }

    return this.raw;
  }

  private getInteractionsUrl() {
    const provider = this.injector.getProviders().find((provider) => provider.subType === INTERACTIONS);

    if (provider) {
      return (ctx: any) => {
        // eslint-disable-line no-unused-vars
        return provider.path.replace(/:uid/, ctx.oidc.uid);
      };
    }
  }

  private allowHttpLocalhost() {
    const {invalidate: orig} = (this.raw.Client as any).Schema.prototype;

    (this.raw.Client as any).Schema.prototype.invalidate = function invalidate(message: string, code: string) {
      if (code === "implicit-force-https" || code === "implicit-forbid-localhost") {
        return;
      }

      /* istanbul ignore next */
      return orig.call(this, message);
    };
  }

  private getPolicy() {
    const interactions = this.oidcInteractions.getInteractions();

    if (interactions.length) {
      const policy = interactionPolicy.base();

      interactions.forEach((provider) => {
        const {name, ...options} = provider.store.get("interactionOptions");

        if (!policy.get(name)) {
          policy.add(
            new interactionPolicy.Prompt({
              name,
              ...options
            })
          );
        }

        if (provider.instance.$onCreate) {
          provider.instance.$onCreate(policy.get(name));
        }
      });

      return policy;
    }
  }
}
