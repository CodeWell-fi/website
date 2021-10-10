// Note: this file will get copied to website-cd/src folder by CD pipeline
export const getStorageAccountName = (
  organization: string,
  environment: string,
) => `${organization}${environment}site`;

export const getCDNEndpointNames = (
  organization: string,
  environment: string,
) => ({
  profileName: `${organization}-${environment}`,
  endpointName: `${organization}-${environment}`,
});
