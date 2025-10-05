import type {
  ConnectorSpi,
  ConnectorObject,
  AttributeValue,
  OperationOptions,
  Schema,
  ObjectClassInfo,
  SchemaAttribute,
  ResultsHandler,
  SearchResult
} from "../spi/types.js";
import { {{connectorName}}Configuration } from "./config.js";

function attr(
  name: string,
  type: "string" | "boolean" | "number" | "binary",
  flags?: Partial<Omit<SchemaAttribute, "name" | "type">>
): SchemaAttribute {
  return { name, type, ...flags };
}

function oc(
  name: string,
  nativeName: string,
  attributes: SchemaAttribute[],
  supports: Array<"CREATE"|"UPDATE"|"DELETE"|"GET"|"SEARCH"|"SYNC">
): ObjectClassInfo {
  return { name, nativeName, attributes, supports };
}

export default async function factory(ctx: {
  logger: Console;
  config: {{connectorName}}Configuration;
  instanceId: string;
  connectorId: string;
  type: string;
}): Promise<ConnectorSpi> {
  const { config, logger } = ctx;

  // TODO: Initialize your connector client/connection here
  // Example: const client = new YourClient(config);

  async function schema(): Promise<Schema> {
    const objectClasses: ObjectClassInfo[] = [
{{objectClassDefinitions}}
    ];

    return { objectClasses };
  }

  async function test(): Promise<void> {
    // TODO: Implement connection test
    logger.log("{{connectorName}} connector test successful");
  }

{{operationMethods}}

  return {
    schema,
    test,
{{operationExports}}
  };
}
