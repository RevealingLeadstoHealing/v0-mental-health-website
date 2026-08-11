import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const template = fs.readFileSync("infra/aws/rlth-ehr-security-operations.yaml", "utf8");

test("reuses the account AWS Config recorder by default", () => {
  assert.match(
    template,
    /CreateConfigRecorderInfrastructure:[\s\S]*?Default: "false"[\s\S]*?ShouldCreateConfigRecorderInfrastructure:/,
  );
  assert.match(template, /ConfigRecorder:[\s\S]*?Condition: ShouldCreateConfigRecorderInfrastructure/);
  assert.match(template, /ConfigDeliveryChannel:[\s\S]*?Condition: ShouldCreateConfigRecorderInfrastructure/);
});

test("reuses retained runtime log groups by default", () => {
  assert.match(template, /CreateRuntimeLogGroups:[\s\S]*?Default: "false"[\s\S]*?ShouldCreateRuntimeLogGroups:/);

  for (const logicalId of ["ApiRuntimeLogGroup", "AuthRuntimeLogGroup", "DocumentRuntimeLogGroup"]) {
    assert.match(
      template,
      new RegExp(`${logicalId}:[\\s\\S]*?Condition: ShouldCreateRuntimeLogGroups`),
    );
  }

  assert.match(template, /Value: !Sub "\/rlth\/\$\{EnvironmentName\}\/ehr\/api-runtime"/);
  assert.match(template, /Value: !Sub "\/rlth\/\$\{EnvironmentName\}\/ehr\/auth-runtime"/);
  assert.match(template, /Value: !Sub "\/rlth\/\$\{EnvironmentName\}\/ehr\/document-runtime"/);
});
