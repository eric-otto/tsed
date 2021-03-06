import {PlatformTest} from "@tsed/common";
import {PlatformKoaRequest} from "@tsed/platform-koa";
import {expect} from "chai";
import Sinon from "sinon";
import {FakeRequest} from "../../../../test/helper";

const sandbox = Sinon.createSandbox();

function createRequest() {
  const req: any = new FakeRequest({sandbox});
  const request = new PlatformKoaRequest(req);

  return {req, request};
}

describe("PlatformKoaRequest", () => {
  beforeEach(() => PlatformTest.create());
  afterEach(() => PlatformTest.reset());
  it("should create a PlatformRequest instance", () => {
    const {req, request} = createRequest();

    expect(request.raw).to.eq(req);
  });

  describe("cookies", () => {
    it("should get cookies from cookie", () => {
      const {req, request} = createRequest();
      req.ctx = {
        cookie: {
          test: "test"
        }
      };

      expect(request.cookies).to.deep.eq({test: "test"});
    });
    it("should get cookies from cookies", () => {
      const {req, request} = createRequest();
      req.ctx = {
        cookies: {
          test: "test"
        }
      };

      expect(request.cookies).to.deep.eq({test: "test"});
    });
  });
  describe("session", () => {
    it("should get session", () => {
      const {req, request} = createRequest();
      req.ctx = {
        session: {
          test: "test"
        }
      };

      expect(request.session).to.deep.eq({test: "test"});
    });
  });
  describe("getReq()", () => {
    it("should return nodejs request", () => {
      const {req, request} = createRequest();
      req.req = {};

      expect(request.getReq()).to.deep.eq({});
    });
  });
});
