-- Do not merge conflicting identities automatically: duplicate rows require operator review.
CREATE UNIQUE INDEX oauth_accounts_provider_subject_key ON oauth_accounts(provider, provider_user_id);
