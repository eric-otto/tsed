import {BodyParams, Controller, HeaderParams, PlatformTest, Post} from "@tsed/common";
import {Status} from "@tsed/schema";
import {Required} from "@tsed/schema";
import {expect} from "chai";
import SuperTest from "supertest";
import {PlatformTestOptions} from "../interfaces";

@Controller("/body-params")
class TestBodyParamsCtrl {
  @Post("/scenario-1")
  @Status(201)
  scenario1(@HeaderParams("Content-type") contentType: string, @BodyParams() payload: any) {
    return {payload, contentType};
  }

  @Post("/scenario-2")
  testScenario1(@BodyParams("test") value: string[]): any {
    return {value};
  }

  @Post("/scenario-3")
  testScenario2(@BodyParams() value: string[]): any {
    return {value};
  }

  @Post("/scenario-4")
  testScenario3(@Required() @BodyParams("test") value: string[]): any {
    return {value};
  }
}

export function testBodyParams(options: PlatformTestOptions) {
  let request: SuperTest.SuperTest<SuperTest.Test>;

  before(
    PlatformTest.bootstrap(options.server, {
      ...options,
      mount: {
        "/rest": [TestBodyParamsCtrl]
      }
    })
  );
  before(() => {
    request = SuperTest(PlatformTest.callback());
  });
  after(PlatformTest.reset);

  describe("Scenario 1: POST /rest/body-params/scenario-1", () => {
    it("should return a 201 response", async () => {
      const response = await request
        .post("/rest/body-params/scenario-1")
        .set({
          "Content-Type": "application/json"
        })
        .send({
          id: "id"
        })
        .expect(201);

      expect(response.body).to.deep.equal({
        contentType: "application/json",
        payload: {
          id: "id"
        }
      });
    });
  });
  describe("Scenario2: with expression Array<string>", () => {
    it("should return value", async () => {
      const response = await request
        .post("/rest/body-params/scenario-2")
        .send({
          test: ["value"]
        })
        .expect(200);

      expect(response.body).to.deep.equal({value: ["value"]});
    });
    it("should return an empty array (1)", async () => {
      const response = await request.post("/rest/body-params/scenario-2").send().expect(200);

      expect(response.body).to.deep.equal({});
    });
    it("should return an empty value (2)", async () => {
      const response = await request.post("/rest/body-params/scenario-2").send({}).expect(200);

      expect(response.body).to.deep.equal({});
    });
  });
  describe("Scenario3: without expression Array<string>", () => {
    it("should return value", async () => {
      const response = await request.post("/rest/body-params/scenario-3").send(["value"]).expect(200);

      expect(response.body).to.deep.equal({value: ["value"]});
    });
    it("should return an empty array (1)", async () => {
      const response = await request.post("/rest/body-params/scenario-3").send().expect(200);

      expect(response.body).to.deep.equal({value: [{}]});
    });
  });
  describe("Scenario4: with expression required Array<string>", () => {
    it("should return value", async () => {
      const response = await request
        .post("/rest/body-params/scenario-4")
        .send({test: ["value"]})
        .expect(200);

      expect(response.body).to.deep.equal({value: ["value"]});
    });
    it("should return an empty array (1)", async () => {
      const response = await request.post("/rest/body-params/scenario-4").send().expect(400);

      expect(response.body).to.deep.equal({
        name: "REQUIRED_VALIDATION_ERROR",
        message: "Bad request on parameter \"request.body.test\".\nIt should have required parameter 'test'",
        status: 400,
        errors: [
          {
            dataPath: "",
            keyword: "required",
            message: "It should have required parameter 'test'",
            modelName: "body",
            params: {missingProperty: "test"},
            schemaPath: "#/required"
          }
        ]
      });
    });
  });
}
