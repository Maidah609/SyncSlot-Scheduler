import { Button } from "@/components/ui/button";

export function OAuthButtons({ disabled }: { disabled?: boolean }) {
  return (
    <div className="grid gap-2">
      <Button variant="outline" type="button" disabled={disabled} className="w-full justify-center gap-2">
        <GoogleIcon />
        Continue with Google
      </Button>
      <Button variant="outline" type="button" disabled={disabled} className="w-full justify-center gap-2">
        <MicrosoftIcon />
        Continue with Microsoft
      </Button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6.2c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.4-4.9 3.4-8.2z" />
      <path fill="#34A853" d="M12 23c3.1 0 5.7-1 7.6-2.8l-3.7-2.8c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8H1.7v3C3.6 20.5 7.5 23 12 23z" />
      <path fill="#FBBC05" d="M5.5 13.7c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2v-3H1.7C.9 7.9.5 9.9.5 11.5s.4 3.6 1.2 5.2l3.8-3z" />
      <path fill="#EA4335" d="M12 4.6c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.6 2.5 1.7 6.3l3.8 3C6.4 6.6 9 4.6 12 4.6z" />
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
