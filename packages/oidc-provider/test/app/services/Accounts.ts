import {Adapter} from "@tsed/adapters";
import {InjectAdapter} from "@tsed/adapters/src/decorators/injectAdapter";
import {PlatformContext} from "@tsed/common/src";
import {Injectable} from "@tsed/di";
import {deserialize} from "@tsed/json-mapper/src";
import {AccessToken, AuthorizationCode, DeviceCode} from "../../../src/domain";
import {Account} from "../models/Account";

@Injectable()
export class Accounts {
  @InjectAdapter("accounts", Account)
  adapter: Adapter<Account>;

  async $onInit() {
    const accounts = await this.adapter.findAll();

    if (!accounts.length) {
      await this.adapter.create(deserialize({
        email: "test@test.com",
        emailVerified: true
      }, {useAlias: false}));
    }
  }

  async findAccount(id: string, token: AuthorizationCode | AccessToken | DeviceCode | undefined, ctx: PlatformContext) {
    const account = await this.adapter.findById(id);
    if (!account) {
      return undefined;
    }

    return account;
  }

  async authenticate(email: string, password: string) {
    return this.adapter.findOne({email});
  }
}