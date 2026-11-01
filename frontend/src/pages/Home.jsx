import Logo from '../components/Logo.jsx'
import Icon from '../components/Icons.jsx'
import { CyberButton, Heading, PageNav, LogoStrip } from '../components/Shared.jsx'

// Facts checked against the official Saveetha Engineering College website (saveetha.ac.in/about-sec)
// and the official Tech Society website (techsociety.saveetha.in).
const STATS = [
  { n: '25', label: 'YEARS SINCE 2001' },
  { n: '5', label: 'TECH SOCIETY COMMUNITIES' },
  { n: '5', label: 'NBA-ACCREDITED UG PROGRAMMES' },
  { n: '6,400+', label: 'LEARNERS AT SEC' },
]

const FEATURES = [
  { i: 'key', t: 'Security Protocols', d: 'Understand how secure systems and communication are designed, and why protocols are built the way they are.' },
  { i: 'search', t: 'Threat Detection', d: 'Learn to recognise, analyse and respond to threats before they turn into incidents.' },
  { i: 'shield', t: 'Hands-on Workshops', d: 'Practical sessions where members try tools and techniques themselves, guided by experienced peers.' },
  { i: 'user', t: 'Peer Mentorship', d: 'Experienced members mentor newcomers, so every learner can start with confidence.' },
  { i: 'cpu', t: 'Real-World Projects', d: 'Teams collaborate on projects that use current technology to solve real problems.' },
  { i: 'flag', t: 'Hackathons', d: 'Test your skills in Hack Hustle, the Tech Society’s 24-hour hackathon, which includes a Cybersecurity stream.' },
]

export default function Home() {
  return (
    <div className="container">
      <section className="hero">
        <div className="hero-logo">
          <Logo file="techsociety.png" label="The Tech Society" size={280} invertOnLight className="hero-ts" />
        </div>
        <div className="hero-text">
          <div className="kicker">The Tech Society · Saveetha Engineering College</div>
          <h1 className="hero-h">Cybersecurity</h1>
          <h2 className="hero-sub">Domain</h2>
          <p className="tagline">Learn. Defend. Secure.</p>
          <p className="lead">
            This is the Cybersecurity community of The Tech Society, a student-led technology community at Saveetha
            Engineering College, Chennai. Members learn about security protocols and threat detection, build their skills
            through workshops and peer-led sessions, and put them to work in projects and hackathons such as Hack Hustle.
            Beginners are always welcome.
          </p>
          <div className="btn-row">
            <CyberButton to="/join">Join the domain</CyberButton>
            <CyberButton to="/events" variant="ghost">View events</CyberButton>
            <CyberButton to="/about" variant="ghost">About us</CyberButton>
          </div>
        </div>
      </section>

      <section className="logos-band tile">
        <div className="band-title">Our institution</div>
        <LogoStrip />
      </section>

      <section className="stats">
        {STATS.map((x) => (
          <div className="stat tile" key={x.label}>
            <b>{x.n}</b>
            <span>{x.label}</span>
          </div>
        ))}
      </section>

      <Heading kicker="Focus areas">What We Do</Heading>
      <section className="grid3">
        {FEATURES.map((f, i) => (
          <div className="tile card" key={f.t}>
            <div className="card-ico"><Icon name={f.i} size={22} /></div>
            <h3>{f.t}</h3>
            <p>{f.d}</p>
            <span className="card-idx">0{i + 1}</span>
          </div>
        ))}
      </section>

      <PageNav />
    </div>
  )
}