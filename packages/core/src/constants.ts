import packageJson from "../package.json" with { type: "json" };

// The server recognizes SDK spans by the ProofState instrumentation scope.
export const PROOFSTATE_TRACER_NAME = "proofstate-sdk";
export const PROOFSTATE_SDK_VERSION = packageJson.version;
export const PROOFSTATE_SDK_NAME = "proofstate-javascript";

export const PROOFSTATE_SDK_EXPERIMENT_ENVIRONMENT = "sdk-experiment";

// From ProofState platform: web/src/features/otel/server/attributes.ts
export enum ProofStateOtelSpanAttributes {
  // ProofState-Trace attributes
  TRACE_NAME = "proofstate.trace.name",
  TRACE_USER_ID = "user.id",
  TRACE_SESSION_ID = "session.id",
  TRACE_TAGS = "proofstate.trace.tags",
  TRACE_PUBLIC = "proofstate.trace.public",
  TRACE_METADATA = "proofstate.trace.metadata",
  TRACE_INPUT = "proofstate.trace.input",
  TRACE_OUTPUT = "proofstate.trace.output",

  // ProofState-observation attributes
  OBSERVATION_TYPE = "proofstate.observation.type",
  OBSERVATION_METADATA = "proofstate.observation.metadata",
  OBSERVATION_LEVEL = "proofstate.observation.level",
  OBSERVATION_STATUS_MESSAGE = "proofstate.observation.status_message",
  OBSERVATION_INPUT = "proofstate.observation.input",
  OBSERVATION_OUTPUT = "proofstate.observation.output",

  // ProofState-observation of type Generation attributes
  OBSERVATION_COMPLETION_START_TIME = "proofstate.observation.completion_start_time",
  OBSERVATION_MODEL = "proofstate.observation.model.name",
  OBSERVATION_MODEL_PARAMETERS = "proofstate.observation.model.parameters",
  OBSERVATION_USAGE_DETAILS = "proofstate.observation.usage_details",
  OBSERVATION_COST_DETAILS = "proofstate.observation.cost_details",
  OBSERVATION_PROMPT_NAME = "proofstate.observation.prompt.name",
  OBSERVATION_PROMPT_VERSION = "proofstate.observation.prompt.version",

  //   General
  ENVIRONMENT = "proofstate.environment",
  RELEASE = "proofstate.release",
  VERSION = "proofstate.version",

  // Internal
  AS_ROOT = "proofstate.internal.as_root",
  IS_APP_ROOT = "proofstate.internal.is_app_root",

  // Experiment attributes
  EXPERIMENT_ID = "proofstate.experiment.id",
  EXPERIMENT_NAME = "proofstate.experiment.name",
  EXPERIMENT_DESCRIPTION = "proofstate.experiment.description",
  EXPERIMENT_METADATA = "proofstate.experiment.metadata",
  EXPERIMENT_DATASET_ID = "proofstate.experiment.dataset.id",
  EXPERIMENT_ITEM_ID = "proofstate.experiment.item.id",
  EXPERIMENT_ITEM_EXPECTED_OUTPUT = "proofstate.experiment.item.expected_output",
  EXPERIMENT_ITEM_METADATA = "proofstate.experiment.item.metadata",
  EXPERIMENT_ITEM_ROOT_OBSERVATION_ID = "proofstate.experiment.item.root_observation_id",

  // Compatibility aliases for older OpenTelemetry property mappings.
  TRACE_COMPAT_USER_ID = "proofstate.user.id",
  TRACE_COMPAT_SESSION_ID = "proofstate.session.id",
}
