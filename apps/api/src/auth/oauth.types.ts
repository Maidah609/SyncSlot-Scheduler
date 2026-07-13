export type OauthProvider = "google" | "microsoft";

export type OauthProviderUser = {
  providerAccountId: string;
  email: string;
  name: string;
  emailVerified: boolean;
};
