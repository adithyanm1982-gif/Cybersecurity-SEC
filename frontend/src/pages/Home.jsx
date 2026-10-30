import { useRef, useState, useEffect } from 'react'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icons.jsx'
import { CyberButton, Heading, PageNav, LogoStrip } from '../components/Shared.jsx'
import { useCount } from '../hooks.js'

function Stat({ n, suffix = '', label }) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVis(true), { threshold: 0.4 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  const v = useCount(n, vis)
  return (
    <div className="stat tile reveal" ref={ref}>
      <b>{v}{suffix}</b>
      <span>{label}</span>
    </div>
  )
}

const FEATURES = [
  { i: 'shield', t: 'Ethical Hacking', d: 'Understand how attackers think so that you can defend systems with confidence.' },
  { i: 'key', t: 'Cryptography', d: 'From classical ciphers to modern encryption, with hands-on practice.' },
  { i: 'flag', t: 'Capture the Flag', d: 'Contests, wargames and live challenges that build practical skill.' },
  { i: 'network', t: 'Network Defense', d: 'Firewalls, intrusion detection, packet analysis and secure design.' },
  { i: 'search', t: 'Digital Forensics', d: 'Collect evidence and reconstruct the timeline of a cyber incident.' },
  { i: 'cpu', t: 'AI for Security', d: 'Applying machine learning to detect and respond to threats faster.' },
]

export default function Home() {
  return (
    <div className="container">
      <section className="hero">
        <div className="hero-logo reveal">
          <Logo file="techsociety.png" label="The Tech Society" size={280} invertOnLight className="hero-ts" />
        </div>
        <div className="hero-text">
          <div className="kicker reveal">The Tech Society · Saveetha Engineering College</div>
          <h1 className="hero-h">Cybersecurity</h1>
          <h2 className="hero-sub">Domain</h2>
          <p className="tagline">Learn. Defend. Secure.</p>
          <p className="lead reveal">
            Welcome to the Cybersecurity domain of The Tech Society. We are a student community that learns, builds and tests
            systems responsibly, from ethical hacking and cryptography to network defense and digital forensics.
            (Sample text, to be updated.)
          </p>
          <div className="btn-row">
            <CyberButton to="/join">Join the domain</CyberButton>
            <CyberButton to="/events" variant="ghost">View events</CyberButton>
            <CyberButton to="/about" variant="ghost">About us</CyberButton>
          </div>
        </div>
      </section>

      <section className="logos-band tile reveal">
        <div className="band-title">Our institution</div>
        <LogoStrip />
      </section>

      <section className="stats">
        <Stat n={25} suffix="+" label="YEARS OF EXCELLENCE" />
        <Stat n={5} label="TECH DOMAINS" />
        <Stat n={9} suffix="+" label="EVENTS CONDUCTED" />
        <Stat n={100} suffix="+" label="ACTIVE MEMBERS" />
      </section>

      <Heading kicker="Focus areas">What We Do</Heading>
      <section className="grid3">
        {FEATURES.map((f, i) => (
          <div className="tile card reveal" key={f.t} style={{ transitionDelay: `${i * 60}ms` }}>
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