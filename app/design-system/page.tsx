import {
  ChanceAppShell,
  ChanceBadge,
  ChanceButton,
  ChanceCard,
  ChanceCardContent,
  ChanceCardDescription,
  ChanceCardFooter,
  ChanceCardHeader,
  ChanceCardTitle,
  ChanceDashboardGrid,
  ChanceField,
  ChanceInline,
  ChanceInput,
  ChancePageHeader,
  ChanceSection,
  ChanceSplitLayout,
  ChanceStack,
  ChanceText,
  ChanceTextarea,
} from "@/components/design-system"

const swatches = [
  { name: "Background", var: "--chance-bg" },
  { name: "Surface", var: "--chance-surface" },
  { name: "Brand", var: "--chance-brand" },
  { name: "Yes", var: "--chance-yes" },
  { name: "No", var: "--chance-no" },
  { name: "Border", var: "--chance-border" },
  { name: "Muted text", var: "--chance-muted-fg" },
]

export default function DesignSystemPage() {
  return (
    <ChanceAppShell width="wide" className="pb-20">
      <ChancePageHeader
        label="Internal reference"
        title="ChanceUS design system"
        description="Kalshi × Linear × Stripe. Use these primitives when migrating screens — product routes are unchanged."
        actions={
          <>
            <ChanceButton variant="outline" size="sm">
              Export tokens
            </ChanceButton>
            <ChanceButton variant="brand" size="sm">
              Start migration
            </ChanceButton>
          </>
        }
      />

      <ChanceSection title="Typography" description="Inter for UI; mono for stakes and scores.">
        <ChanceStack gap="lg" className="max-w-3xl">
          <ChanceText variant="display">Display — skill meets stakes</ChanceText>
          <ChanceText variant="h1">Heading 1 — Dashboard</ChanceText>
          <ChanceText variant="h2">Heading 2 — Active matches</ChanceText>
          <ChanceText variant="h3">Heading 3 — Wallet balance</ChanceText>
          <ChanceText variant="bodyLg">Body large — short lead copy for sections.</ChanceText>
          <ChanceText variant="body">Body — default UI text at 14px.</ChanceText>
          <ChanceText variant="muted">Muted — secondary description and helper text.</ChanceText>
          <ChanceText variant="caption">Caption — timestamps and footnotes</ChanceText>
          <ChanceText variant="label">Label — section kickers</ChanceText>
          <ChanceText variant="mono">1,250 tokens · 62% win rate · +340</ChanceText>
        </ChanceStack>
      </ChanceSection>

      <ChanceSection title="Color" description="Semantic roles with light/dark via CSS variables.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {swatches.map((s) => (
            <div
              key={s.var}
              className="flex items-center gap-3 rounded-chance-lg border border-chance-border p-3"
            >
              <div
                className="size-10 shrink-0 rounded-chance-md border border-chance-border shadow-chance-xs"
                style={{ background: `var(${s.var})` }}
              />
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="font-mono text-xs text-chance-muted-fg">{s.var}</p>
              </div>
            </div>
          ))}
        </div>
      </ChanceSection>

      <ChanceSection title="Buttons">
        <ChanceStack gap="md">
          <ChanceInline>
            <ChanceButton>Primary</ChanceButton>
            <ChanceButton variant="brand">Brand</ChanceButton>
            <ChanceButton variant="secondary">Secondary</ChanceButton>
            <ChanceButton variant="outline">Outline</ChanceButton>
            <ChanceButton variant="ghost">Ghost</ChanceButton>
            <ChanceButton variant="destructive">Destructive</ChanceButton>
            <ChanceButton variant="link">Link</ChanceButton>
          </ChanceInline>
          <ChanceInline>
            <ChanceButton variant="yes">Yes · 62¢</ChanceButton>
            <ChanceButton variant="no">No · 38¢</ChanceButton>
            <ChanceButton size="sm">Small</ChanceButton>
            <ChanceButton size="lg">Large</ChanceButton>
          </ChanceInline>
        </ChanceStack>
      </ChanceSection>

      <ChanceSection title="Badges">
        <ChanceInline>
          <ChanceBadge>Default</ChanceBadge>
          <ChanceBadge variant="brand">Brand</ChanceBadge>
          <ChanceBadge variant="success">Success</ChanceBadge>
          <ChanceBadge variant="warning">Warning</ChanceBadge>
          <ChanceBadge variant="yes">Yes</ChanceBadge>
          <ChanceBadge variant="no">No</ChanceBadge>
          <ChanceBadge variant="live" showLiveDot>
            Live
          </ChanceBadge>
        </ChanceInline>
      </ChanceSection>

      <ChanceSection title="Cards & inputs">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChanceCard variant="interactive">
            <ChanceCardHeader>
              <ChanceCardTitle>Interactive card</ChanceCardTitle>
              <ChanceCardDescription>Elevates on hover — lists, match rows.</ChanceCardDescription>
            </ChanceCardHeader>
            <ChanceCardContent>
              <ChanceText variant="mono">Bet 500 · Pool 1,000 tokens</ChanceText>
            </ChanceCardContent>
            <ChanceCardFooter>
              <ChanceButton size="sm" variant="brand">
                Join match
              </ChanceButton>
            </ChanceCardFooter>
          </ChanceCard>

          <ChanceCard variant="inset" padding="md">
            <ChanceStack gap="md">
              <ChanceField label="Username" hint="Shown on leaderboards" htmlFor="ds-username">
                <ChanceInput id="ds-username" placeholder="player_one" />
              </ChanceField>
              <ChanceField label="Bio" error="Max 160 characters" htmlFor="ds-bio">
                <ChanceTextarea id="ds-bio" state="error" placeholder="Optional" />
              </ChanceField>
            </ChanceStack>
          </ChanceCard>
        </div>
      </ChanceSection>

      <ChanceSection title="Shadows & radius">
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["shadow-chance-xs", "xs"],
              ["shadow-chance-md", "md"],
              ["shadow-chance-lg", "lg"],
            ] as const
          ).map(([className, label]) => (
            <div
              key={label}
              className={`rounded-chance-xl border border-chance-border bg-chance-surface p-6 ${className}`}
            >
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </ChanceSection>

      <ChanceSection title="Animations">
        <ChanceInline>
          <div className="animate-chance-in rounded-chance-lg border border-chance-border px-4 py-3 text-sm">
            animate-chance-in
          </div>
          <div className="animate-chance-slide-up rounded-chance-lg border border-chance-border px-4 py-3 text-sm">
            animate-chance-slide-up
          </div>
          <div className="animate-chance-scale-in rounded-chance-lg border border-chance-border px-4 py-3 text-sm">
            animate-chance-scale-in
          </div>
        </ChanceInline>
      </ChanceSection>

      <ChanceSection title="Layout patterns" description="Compose shells without touching product routes.">
        <ChanceSplitLayout
          sidebar={
            <ChanceCard variant="outline" padding="sm">
              <ChanceText variant="label">Sidebar</ChanceText>
              <ChanceStack gap="sm" className="mt-3">
                <ChanceButton variant="ghost" size="sm" className="justify-start">
                  Overview
                </ChanceButton>
                <ChanceButton variant="ghost" size="sm" className="justify-start">
                  Matches
                </ChanceButton>
                <ChanceButton variant="ghost" size="sm" className="justify-start">
                  Wallet
                </ChanceButton>
              </ChanceStack>
            </ChanceCard>
          }
        >
          <ChanceText variant="h4" className="mb-4">
            Dashboard grid
          </ChanceText>
          <ChanceDashboardGrid>
            {["Win rate", "Tokens", "Rank", "Streak"].map((label) => (
              <ChanceCard key={label} padding="sm">
                <ChanceText variant="label">{label}</ChanceText>
                <ChanceText variant="mono" className="mt-2 text-lg">
                  {label === "Tokens" ? "4,820" : "—"}
                </ChanceText>
              </ChanceCard>
            ))}
          </ChanceDashboardGrid>
        </ChanceSplitLayout>
      </ChanceSection>
    </ChanceAppShell>
  )
}
