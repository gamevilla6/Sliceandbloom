const isProductionBuild = process.env.NODE_ENV === "production"
  || process.env.EAS_BUILD_PROFILE === "production"
  || process.env.EAS_BUILD === "true";

module.exports = ({ config }) => {
  const explicitApi = process.env.EXPO_PUBLIC_API_BASE_URL;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  const apiBaseUrl = explicitApi
    || (!isProductionBuild && devDomain
      ? `https://${devDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/api`
      : config.extra?.apiBaseUrl);

  return {
    ...config,
    extra: {
      ...config.extra,
      apiBaseUrl,
    },
  };
};
