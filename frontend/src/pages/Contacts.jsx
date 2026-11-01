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
          <a href="tel:+918438704709" className="c-val">+91 84387 04709</a>
          <a href="tel:+9191124 95663" className="c-val">+91 91124 95663</a>
          <span className="c-note">Monday to Friday · 9 am to 5 pm</span>
        </div>
        <div className="tile contact reveal" style={{ transitionDelay: '120ms' }}>
          <div className="c-ico"><Icon name="mail" size={22} /></div>
          <h3>Contact Email</h3>
          <a href="mailto:quoter8888@gmail.com" className="c-val">quoter8888@gmail.com</a>
        </div>
      </section>

      <PageNav />
    </div>
  )
}