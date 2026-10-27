import { Heading, PageNav } from '../components/Shared.jsx'

// The live shell has been removed on purpose.
// FUTURE: the "enter a site name -> show information about it" box will go inside .terminal-slot.
export default function Terminal() {
  return (
    <div className="container narrow" style={{ maxWidth: 1040 }}>
      <Heading kicker="SHELL ACCESS">Terminal</Heading>
      <div className="terminal-slot" aria-hidden="true" />
      <PageNav />
    </div>
  )
}