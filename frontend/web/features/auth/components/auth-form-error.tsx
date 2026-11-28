export function AuthFormError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-destructive-content">
      {message}
    </p>
  ) : null;
}
