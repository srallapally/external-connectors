import type { Configuration } from "../spi/configuration.js";

export interface {{connectorName}}Configuration extends Configuration {
  // TODO: Define your connector-specific configuration properties
  // Example:
  // apiUrl: string;
  // apiKey: string;
  // timeout?: number;
}

export async function buildConfiguration(raw: any): Promise<{{connectorName}}Configuration> {
  // TODO: Validate and build configuration
  const config: {{connectorName}}Configuration = {
    ...raw
  };

  return config;
}

export default buildConfiguration;
