import { Heading, PageNav } from '../components/Shared.jsx'
import Icon from '../components/Icons.jsx'

export default function Contacts() {
  return (
    <div className="container">
      <Heading kicker="Get in touch">Contact Us</Heading>
      <p className="lead center reveal">
        Have a question, an idea or want to collaborate? Reach out to the Cybersecurity domain team. We read every message.
        (Sample text, to be updated.)
      </p>

      <section className="contact-grid">
        <div className="tile contact reveal">
          <div className="c-ico"><Icon name="phone" size={22} /></div>
          <h3>Contact number</h3>
          <a href="tel:+919876543210" className="c-val">+91 98765 43210</a>
          <span className="c-note">Monday to Friday · 9 am to 5 pm</span>
        </div>
        <div className="tile contact reveal" style={{ transitionDelay: '120ms' }}>
          <div className="c-ico"><Icon name="mail" size={22} /></div>
          <h3>Email</h3>
          <a href="mailto:cybersec.techsociety@example.com" className="c-val">cybersec.techsociety@example.com</a>
          <a href="mailto:coordinator.cyber@example.com" className="c-val">coordinator.cyber@example.com</a>
        </div>
      </section>

      <PageNav />
    </div>
  )
}