const isProductionBuild =
  process.env.NODE_ENV === "production" ||
  process.env.EAS_BUILD_PROFILE === "production" ||
  process.env.EAS_BUILD === "true";

module.exports = ({ config }) => {
  const explicitApi = process.env.EXPO_PUBLIC_API_BASE_URL;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  const githubPagesBaseUrl =
    process.env.EXPO_PUBLIC_GITHUB_PAGES_BASE_URL?.trim();
  const apiBaseUrl =
    explicitApi ||
    (!isProductionBuild && devDomain
      ? `https://${devDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/api`
      : config.extra?.apiBaseUrl);
  const experiments = { ...config.experiments };

  // GitHub project pages live under /<repo>, unlike Replit and native builds.
  // Set this only in the Pages build workflow to leave other targets at /.
  if (githubPagesBaseUrl) {
    const baseUrl = githubPagesBaseUrl.replace(/\/+$/, "");
    if (
      !baseUrl.startsWith("/") ||
      baseUrl.startsWith("//") ||
      baseUrl.includes("..")
    ) {
      throw new Error(
        "EXPO_PUBLIC_GITHUB_PAGES_BASE_URL must be a safe path such as /Sliceandbloom.",
      );
    }
    experiments.baseUrl = baseUrl;
  }

  return {
    ...config,
    experiments,
    extra: {
      ...config.extra,
      apiBaseUrl,
    },
  };
};
