import Image from "next/image"

/** Stylized product frame — mirrors in-app Home / Play (presentation only). */
export default function LandingMockup() {
  return (
    <div className="chance-landing-mockup-stage" aria-hidden>
      <div className="chance-landing-mockup-glow" />
      <div className="chance-landing-mockup-device">
        <div className="chance-landing-mockup-chrome">
          <span className="chance-landing-mockup-dot" />
          <span className="chance-landing-mockup-dot" />
          <span className="chance-landing-mockup-dot" />
        </div>
        <div className="chance-landing-mockup-screen">
          <div className="chance-landing-mockup-sidebar">
            <div className="chance-landing-mockup-logo" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`chance-landing-mockup-nav ${i === 2 ? "is-active" : ""}`} />
            ))}
          </div>
          <div className="chance-landing-mockup-main">
            <div className="chance-landing-mockup-hero">
              <p className="chance-landing-mockup-kicker">Ranked skill</p>
              <p className="chance-landing-mockup-headline">Prove it. Win it.</p>
              <div className="chance-landing-mockup-cta-row">
                <span className="chance-landing-mockup-cta-primary">Queue now</span>
                <span className="chance-landing-mockup-cta-ghost">Wallet</span>
              </div>
            </div>
            <div className="chance-landing-mockup-tiles">
              <div className="chance-landing-mockup-tile chance-landing-mockup-tile--featured">
                <Image src="/4-in-a-row.JPG" alt="" fill className="object-cover" sizes="200px" />
              </div>
              <div className="chance-landing-mockup-tile">
                <Image src="/math-blitz.JPG" alt="" fill className="object-cover" sizes="120px" />
              </div>
              <div className="chance-landing-mockup-tile">
                <Image src="/trivia-blitz.JPG" alt="" fill className="object-cover" sizes="120px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
