// Note: this file will get copied to website-cd/src folder by CD pipeline
export const getCDNProfileName = (organization: string, environment: string) =>
  `${organization}-${environment}`;

export const getStorageAccountName = (
  organization: string,
  environment: string,
  id: string,
) => `${organization}${environment}site${id}`;

export const getCDNProfileEndpointName = (
  organization: string,
  environment: string,
  id: string,
) => `${organization}-${environment}-${id}`;
