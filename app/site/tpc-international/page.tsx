import Link from 'next/link'
import { ArrowRight, Cookie, Globe2, BarChart3, Shield, Users, Workflow, Building2, Database } from 'lucide-react'

export const metadata = {
  title: 'TPC International — Data-Driven Digital Solutions',
  description: 'Third-Party Cookies International (TPC) delivers enterprise-grade digital transformation, analytics, and custom software solutions worldwide.',
}

export default function TPCInternationalPage() {
  return (
    <div className="min-h-dvh bg-white text-zinc-900 antialiased">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <Cookie className="size-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight">TPC International</span>
              <span className="text-[9px] font-medium tracking-widest text-zinc-400">THIRD-PARTY COOKIES</span>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-zinc-500 md:flex">
            <a href="#solutions" className="transition-colors hover:text-zinc-900">Solutions</a>
            <a href="#approach" className="transition-colors hover:text-zinc-900">Approach</a>
            <a href="#start" className="transition-colors hover:text-zinc-900">Get Started</a>
          </nav>
          <Link
            href="/auth?org=tpc-international"
            className="group flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:scale-[1.02]"
          >
            Start a Project
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(251,191,36,0.08),transparent)]" />
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-28 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5">
            <Globe2 className="size-3.5 text-amber-600" />
            <span className="text-xs font-semibold tracking-wide text-amber-700">GLOBAL DIGITAL CONSULTING</span>
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-[1.1] tracking-tight text-zinc-900 md:text-6xl">
            Data-Driven
            <br />
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Digital Solutions
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-500">
            We help enterprises modernize their tech stack, harness data analytics, 
            and build custom software that drives real business outcomes.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth?org=tpc-international"
              className="group flex items-center gap-2.5 rounded-full bg-zinc-900 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-zinc-900/10 transition-all hover:bg-zinc-800 hover:scale-[1.02]"
            >
              Discuss Your Idea
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#solutions"
              className="rounded-full border border-zinc-200 px-8 py-3.5 text-base font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
            >
              View Solutions
            </a>
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section id="solutions" className="border-t border-zinc-100 bg-zinc-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">What We Deliver</p>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900 md:text-4xl">Enterprise-Grade Solutions</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: BarChart3, title: 'Analytics & BI', desc: 'Transform raw data into actionable business intelligence with custom dashboards and reporting.' },
              { icon: Shield, title: 'Cybersecurity', desc: 'Enterprise security audits, compliance frameworks, and data protection strategies.' },
              { icon: Workflow, title: 'Process Automation', desc: 'Automate repetitive workflows with AI-powered tools and intelligent document processing.' },
              { icon: Building2, title: 'Digital Transformation', desc: 'End-to-end modernization of legacy systems, cloud migration, and architecture redesign.' },
              { icon: Users, title: 'Custom Portals', desc: 'Client portals, vendor management systems, and stakeholder collaboration platforms.' },
              { icon: Database, title: 'Data Engineering', desc: 'ETL pipelines, data warehousing, and real-time streaming architecture at scale.' },
            ].map((s) => (
              <div key={s.title} className="group rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm transition-all hover:border-amber-200 hover:shadow-md">
                <div className="mb-4 inline-flex rounded-xl bg-amber-50 p-3 text-amber-600 transition-colors group-hover:bg-amber-100">
                  <s.icon className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approach */}
      <section id="approach" className="border-t border-zinc-100 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">How We Work</p>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900 md:text-4xl">Streamlined Engagement</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: '01', title: 'Discovery', desc: 'Share your vision through our AI-guided requirements session.' },
              { step: '02', title: 'Strategy', desc: 'We deliver a detailed technical blueprint and project roadmap.' },
              { step: '03', title: 'Execution', desc: 'Agile development with weekly demos and transparent progress.' },
              { step: '04', title: 'Delivery', desc: 'Deployed, documented, and supported with SLA guarantees.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-50 font-mono text-xl font-bold text-amber-600">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold text-zinc-900">{s.title}</h3>
                <p className="text-sm text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="start" className="border-t border-zinc-100 bg-zinc-50 py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-zinc-900 md:text-4xl">Let&apos;s Build Your Next Big Thing</h2>
          <p className="mt-4 text-lg text-zinc-500">
            Our AI-powered discovery session captures your requirements in minutes. 
            You&apos;ll get a comprehensive project blueprint before we even start coding.
          </p>
          <Link
            href="/auth?org=tpc-international"
            className="group mt-8 inline-flex items-center gap-2.5 rounded-full bg-zinc-900 px-10 py-4 text-lg font-semibold text-white shadow-xl shadow-zinc-900/10 transition-all hover:bg-zinc-800 hover:scale-[1.02]"
          >
            Start Free Discovery
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Cookie className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-500">TPC International</span>
          </div>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} Third-Party Cookies International. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
