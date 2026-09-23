import { MapPin, QrCode, Trophy, TrendingUp, Users } from "lucide-react"

const STEPS = [
  { icon: MapPin, title: "Discover", body: "Find a venue or themed night near you." },
  { icon: QrCode, title: "Check in", body: "Scan at the door or enter tonight's code." },
  { icon: Users, title: "Compete", body: "Join the live room and climb the board." },
  { icon: Trophy, title: "Win", body: "Top scores earn bragging rights and rewards." },
  { icon: TrendingUp, title: "Climb local rankings", body: "Carry your online rank into the room." },
]

export default function VenuesHowItWorks() {
  return (
    <section className="chance-venues-section" aria-labelledby="venues-how-heading">
      <header className="chance-venues-section-head">
        <h2 id="venues-how-heading" className="chance-section-title text-base">
          How it works
        </h2>
        <p className="chance-text-caption">From discovery to local legend — five beats, zero admin vibes.</p>
      </header>

      <ol className="chance-venues-timeline">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          return (
            <li key={step.title} className="chance-venues-timeline-step">
              <div className="chance-venues-timeline-marker">
                <span className="chance-venues-timeline-index">{index + 1}</span>
                <span className="chance-venues-timeline-icon">
                  <Icon className="size-4 stroke-[1.75]" aria-hidden />
                </span>
              </div>
              <div className="chance-venues-timeline-copy">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="chance-text-caption mt-0.5">{step.body}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
