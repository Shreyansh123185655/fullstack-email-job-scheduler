import type { Email, EmailStatus } from "../../types";
import Button from "../ui/Button";
import Spinner from "../ui/Spinner";
import StateMessage from "../ui/StateMessage";
import EmailRow from "./EmailRow";

interface Props { emails: Email[]; loading: boolean; error: string | null; status: EmailStatus; searching: boolean; onRetry: () => void }

export default function EmailList({ emails, loading, error, status, searching, onRetry }: Props) {
  if (loading) return <Spinner label="Loading emails…" />;
  if (error) return <StateMessage title="We couldn't load your emails" hint={error} action={<Button onClick={onRetry}>Try again</Button>} />;
  if (!emails.length)
    return searching
      ? <StateMessage title="No emails match your search" hint="Try a different recipient or subject." />
      : <StateMessage title={status === "scheduled" ? "Nothing scheduled yet" : "No emails sent yet"} hint={status === "scheduled" ? "Compose an email and pick when it should go out." : "Sent emails will show up here."} />;
  return <div>{emails.map((e) => <EmailRow key={e.id} email={e} />)}</div>;
}
