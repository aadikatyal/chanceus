type FeaturePageHeaderProps = {
  kicker: string
  title: string
  description?: string
}

/** Canonical page header — matches Home / Play / Wallet rhythm (presentation only). */
export default function FeaturePageHeader({ kicker, title, description }: FeaturePageHeaderProps) {
  return (
    <header className="mb-6">
      <p className="chance-hero-kicker">{kicker}</p>
      <h1 className="chance-hero-title text-2xl sm:text-3xl">{title}</h1>
      {description ? <p className="chance-text-caption mt-1">{description}</p> : null}
    </header>
  )
}
