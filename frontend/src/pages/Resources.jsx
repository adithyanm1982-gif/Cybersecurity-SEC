import { useState } from 'react'
import { Heading, PageNav } from '../components/Shared.jsx'
import Icon from '../components/Icons.jsx'

// Click a topic and its explanation slides open. Edit any text here anytime.
const PATHS = [
  {
    lvl: 'BEGINNER', title: 'Security Fundamentals',
    items: [
      { t: 'CIA triad & threat models', d: 'The CIA triad is the foundation of information security. Confidentiality means only the right people can read data, integrity means data cannot be changed without detection, and availability means systems and data are there when needed. A threat model builds on this: you list what you are protecting (assets), who might attack it and how (threats), and what you will do about each risk. Frameworks such as STRIDE help you ask the right questions early, before a system is built.' },
      { t: 'Linux & command line basics', d: 'Most servers, and most security tools, run on Linux, so working comfortably in the terminal is an essential skill. Start with moving around the file system (cd, ls, pwd), reading and searching files (cat, less, grep), and managing files and folders. Then learn file permissions (chmod, chown), users and processes, and how to chain commands together with pipes. Practise in a virtual machine so you can experiment safely.' },
      { t: 'Networking essentials (TCP/IP, DNS, HTTP)', d: 'Every attack and every defence happens over a network, so you need to know how data travels. IP addresses identify devices and ports identify services on them. TCP provides reliable connections, set up by a three-step handshake. DNS translates names like example.com into IP addresses. HTTP is the request-and-response language of the web, and HTTPS wraps it in encryption. Knowing these basics lets you recognise what normal traffic looks like.' },
      { t: 'Password & identity hygiene', d: 'Most real breaches start with stolen or guessed credentials. Good hygiene means long, unique passphrases for every account, stored in a password manager, plus multi-factor authentication wherever it is offered. Websites should store passwords only as salted hashes, never as plain text. Learn to spot phishing, which tricks people into giving credentials away, and check whether your accounts have appeared in known breaches.' },
    ],
  },
  {
    lvl: 'INTERMEDIATE', title: 'Offensive & Defensive Skills',
    items: [
      { t: 'Web app security (OWASP Top 10)', d: 'The OWASP Top 10 is a regularly updated list of the most critical web application security risks, such as broken access control, injection flaws, cross-site scripting (XSS), insecure design and security misconfiguration. Understanding each category teaches you how a small coding mistake can expose user data. Practise only in deliberately vulnerable training apps such as OWASP Juice Shop or DVWA, and never test a real website without written permission.' },
      { t: 'Cryptography in practice', d: 'Cryptography protects data using mathematics. Symmetric encryption uses one shared key and is fast, asymmetric encryption uses a public and private key pair, and hash functions create a fixed fingerprint of data. Digital signatures prove who created a message, and TLS combines all of these to secure the web. The golden rule is to use well-tested libraries and standards and never invent your own cipher, because key management and correct usage matter as much as the algorithm.' },
      { t: 'Packet analysis with Wireshark', d: 'Wireshark captures network traffic and shows it packet by packet, so you can see exactly what devices are saying to each other. You learn to use capture and display filters, follow a conversation (stream), and identify protocols such as DNS, HTTP and TCP. This is how defenders investigate slow networks, strange connections and possible attacks. Only capture traffic on networks you own or are explicitly authorised to monitor.' },
      { t: 'Intro to CTFs & wargames', d: 'Capture the Flag (CTF) competitions are security puzzles where you find a hidden text string, the flag, to score points. In jeopardy-style CTFs you pick challenges from categories like web, cryptography, forensics, reverse engineering and binary exploitation. Attack-and-defence CTFs make teams protect their own systems while testing others. Beginner-friendly platforms such as picoCTF and OverTheWire are a safe, legal way to build practical skill and teamwork.' },
    ],
  },
  {
    lvl: 'ADVANCED', title: 'Specialisation Tracks',
    items: [
      { t: 'Reverse engineering & malware analysis', d: 'Reverse engineering means working out how a program behaves when you do not have its source code. Static analysis studies the file without running it, using disassemblers and decompilers such as Ghidra, while dynamic analysis observes it as it runs. Malware analysts use these methods to understand what a malicious program does, how it spreads and how to detect it. Samples must only ever be handled inside isolated virtual machines with no access to real networks or data.' },
      { t: 'Digital forensics & incident response', d: 'Digital forensics collects and examines evidence from computers, phones, networks and logs in a way that stands up to scrutiny, which means preserving the original data and recording a chain of custody. Incident response is the process an organisation follows when an attack happens: prepare, detect, contain, eradicate, recover and learn from it. Together they answer what happened, how it happened, how far it spread and how to stop it happening again.' },
      { t: 'Cloud & container security', d: 'Cloud providers secure the underlying infrastructure, but customers remain responsible for their own configuration, a principle called the shared responsibility model. The most common cloud incidents come from misconfiguration, such as publicly exposed storage or overly broad permissions, so the principle of least privilege in identity and access management is vital. For containers and Kubernetes, security means scanning images for vulnerabilities, keeping secrets out of code and limiting what each container is allowed to do.' },
      { t: 'AI-driven threat detection', d: 'Machine learning helps security teams find threats in volumes of data too large to review by hand. Models can flag unusual login behaviour, classify phishing emails and malware, and spot abnormal network traffic. The challenges are real too: too many false alarms, the need for good-quality training data, and attackers who deliberately try to fool the models (adversarial attacks). The best results come from combining AI with human analysts.' },
    ],
  },
]

// Edit descriptions here anytime
const TOOLS = [
  { name: 'Kali Linux', tag: 'OPERATING SYSTEM', desc: 'A Linux distribution packed with hundreds of penetration-testing and security-auditing tools, ready to use.' },
  { name: 'Wireshark', tag: 'NETWORK ANALYSIS', desc: 'Captures and inspects network packets in real time so you can see exactly what travels across a network.' },
  { name: 'Nmap', tag: 'SCANNER', desc: 'Discovers hosts, open ports and running services on a network. Usually the first step of reconnaissance.' },
  { name: 'Burp Suite', tag: 'WEB SECURITY', desc: 'An intercepting proxy used to test web applications for flaws like SQL injection and XSS.' },
  { name: 'Metasploit', tag: 'EXPLOIT FRAMEWORK', desc: 'A framework for developing and running exploits in a lab, used to understand and validate vulnerabilities.' },
  { name: 'Ghidra', tag: 'REVERSE ENGINEERING', desc: 'A free software reverse-engineering suite that disassembles and decompiles programs to study how they work.' },
  { name: 'John the Ripper', tag: 'PASSWORD AUDIT', desc: 'A password-cracking tool used to test password strength and find weak hashes in security audits.' },
  { name: 'CyberChef', tag: 'DATA TOOLKIT', desc: 'The "cyber Swiss army knife": encode, decode, encrypt and analyse data right in the browser.' },
]

export default function Resources() {
  const [tab, setTab] = useState(0)
  const [openTopic, setOpenTopic] = useState(null) // index of the topic that is slid open (one at a time)
  const [active, setActive] = useState(null) // tapped tool (for touch screens)
  const p = PATHS[tab]

  const changeTab = (i) => { setTab(i); setOpenTopic(null) }

  return (
    <div className="container" onClick={() => setActive(null)}>
      <Heading kicker="Knowledge base">Resources</Heading>
      <p className="lead center">A learning roadmap and toolkit for new members. Select a topic to read about it.</p>

      <div className="tabs">
        {PATHS.map((x, i) => (
          <button key={x.lvl} className={`cbtn ${tab === i ? '' : 'ghost'}`} onClick={() => changeTab(i)}><span>{x.lvl}</span></button>
        ))}
      </div>

      <section className="tile path">
        <div className="kicker">Level 0{tab + 1}</div>
        <h3>{p.title}</h3>
        <ul>
          {p.items.map((it, i) => {
            const open = openTopic === i
            return (
              <li key={it.t} className={`topic ${open ? 'open' : ''}`}>
                <button className="topic-head" aria-expanded={open} onClick={() => setOpenTopic(open ? null : i)}>
                  <b>›</b>
                  <span>{it.t}</span>
                  <Icon name="chevron-right" size={18} className="topic-arrow" />
                </button>
                <div className="topic-body" aria-hidden={!open}>
                  <div><p>{it.d}</p></div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <Heading kicker="Toolkit · hover or tap a tool">Tools We Use</Heading>
      <section className="chips">
        {TOOLS.map((t) => (
          <div className={`chip-wrap ${active === t.name ? 'on' : ''}`} key={t.name}>
            <button
              className="chip"
              onClick={(e) => { e.stopPropagation(); setActive(active === t.name ? null : t.name) }}
              onFocus={() => setActive(t.name)}
              onBlur={() => setActive(null)}
            >
              {t.name}
            </button>
            <div className="tool-pop" role="tooltip">
              <h4>{t.name}</h4>
              <p>{t.desc}</p>
              <span className="tag">{t.tag}</span>
            </div>
          </div>
        ))}
      </section>

      <PageNav />
    </div>
  )
}