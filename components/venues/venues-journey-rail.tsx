import { MapPin, QrCode, Trophy, Users } from "lucide-react"

const STEPS = [
  { icon: MapPin, title: "Discover", body: "Find a venue running live competitive nights." },
  { icon: QrCode, title: "Check in", body: "Scan at the door or enter the venue code." },
  { icon: Users, title: "Join the session", body: "Pick tonight's event and claim your seat." },
  { icon: Trophy, title: "Climb the board", body: "Compete in-room and come back next week." },
]

export default function VenuesJourneyRail() {
  return (
    <section className="chance-venues-journey chance-premium-card p-4 sm:p-[1.125rem]">
      <h2 className="chance-section-title text-base">Tonight&apos;s path</h2>
      <p className="chance-text-caption mb-4">Online rank meets the real world.</p>
      <ol className="chance-venues-journey-steps">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={step.title} className="chance-venues-journey-step">
              <span className="chance-venues-journey-index">{i + 1}</span>
              <span className="chance-venues-journey-icon" aria-hidden>
                <Icon className="size-4 stroke-[1.75]" />
              </span>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="chance-text-caption">{step.body}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
