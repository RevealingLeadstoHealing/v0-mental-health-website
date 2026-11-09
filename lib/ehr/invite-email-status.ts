// Maps the server's inviteEmailStatus string to plain-language text for staff.
export function describeInviteEmailStatus(status: unknown): { delivered: boolean; message: string } {
  const value = typeof status === "string" ? status.trim() : "";
  if (value === "sent") return { delivered: true, message: "The intake package email was sent." };
  if (value === "not-configured") {
    return { delivered: false, message: "The intake package email was not sent because the server has no AWS credentials at runtime. The patient login was created, but ask your administrator to grant the app's compute role ses:SendEmail and try again." };
  }
  if (value.startsWith("email-failed:")) {
    return { delivered: false, message: `The intake package email was rejected by Amazon SES (${value.slice("email-failed:".length).trim()}). The patient login was created, but the email did not go out. Check that the sender is verified in SES and the compute role has ses:SendEmail, then resend.` };
  }
  if (value.startsWith("email-error:")) {
    return { delivered: false, message: `The intake package email could not be sent (${value.slice("email-error:".length).trim()}). The patient login was created. Try again in a moment.` };
  }
  return { delivered: false, message: "The server did not confirm that the intake package email was sent. Try again, and check the patient email address." };
}
