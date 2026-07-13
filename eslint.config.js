import baseConfig from "@oedulms/config/eslint/base";
import reactConfig from "@oedulms/config/eslint/react";

export default [
  ...baseConfig,
  ...reactConfig.map((config) => {
    if (config.plugins && (config.plugins.react || config.plugins["react-hooks"])) {
      return {
        ...config,
        files: ["**/*.{jsx,tsx}"],
      };
    }
    return config;
  }),
];
