import { Button } from "@/components/ui/button";
import { providers } from "@/lib/providers/registry";
import type { ProviderId } from "@/lib/providers/types";

export interface ProviderSwitcherProps {
  active: ProviderId;
  onChange: (next: ProviderId) => void;
}

const PROVIDER_ORDER: ProviderId[] = ["cloudflare", "edgeone", "esa"];

export function ProviderSwitcher({ active, onChange }: ProviderSwitcherProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 p-1">
      {PROVIDER_ORDER.map((providerId) => (
        <Button
          key={providerId}
          size="sm"
          variant={providerId === active ? "default" : "ghost"}
          data-active={providerId === active}
          onClick={() => onChange(providerId)}
        >
          {providers[providerId].label}
        </Button>
      ))}
    </div>
  );
}
