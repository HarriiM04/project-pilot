import Link from 'next/link'
import { ArrowRight, Code2, Globe, Layers, Lightbulb, Monitor, Rocket, Smartphone, Zap } from 'lucide-react'

export const metadata = {
  title: 'Horizon Tech — Building Tomorrow\'s Software Today',
  description: 'Horizon Tech is a full-service software development company specializing in custom web apps, mobile solutions, and enterprise systems.',
}

export default function HorizonTechPage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0f] text-white antialiased">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Code2 className="size-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Horizon Tech</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#services" className="transition-colors hover:text-white">Services</a>
            <a href="#process" className="transition-colors hover:text-white">Process</a>
            <a href="#contact" className="transition-colors hover:text-white">Contact</a>
          </nav>
          <Link
            href="/auth?org=horizon-tech"
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/40 hover:scale-[1.02]"
          >
            Start a Project
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,80,255,0.15),transparent)]" />
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-28 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-1.5">
            <Zap className="size-3.5 text-violet-400" />
            <span className="text-xs font-medium tracking-wide text-violet-300">AI-POWERED DISCOVERY</span>
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            Building Tomorrow&apos;s
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Software Today
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            We turn your ideas into production-ready software. From discovery to deployment, 
            our team delivers scalable web apps, mobile solutions, and enterprise systems.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth?org=horizon-tech"
              className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:scale-[1.02]"
            >
              Discuss Your Idea
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#services"
              className="rounded-full border border-zinc-700 px-8 py-3.5 text-base font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              View Services
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-white/5 bg-[#0d0d14] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">What We Build</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">End-to-End Development Services</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Monitor, title: 'Web Applications', desc: 'Scalable SaaS platforms, dashboards, and internal tools built with modern frameworks.' },
              { icon: Smartphone, title: 'Mobile Apps', desc: 'Native and cross-platform mobile apps for iOS and Android with seamless UX.' },
              { icon: Globe, title: 'E-Commerce', desc: 'Custom storefronts, marketplace solutions, and headless commerce architectures.' },
              { icon: Layers, title: 'Enterprise Systems', desc: 'ERP integrations, workflow automation, and legacy system modernization.' },
              { icon: Lightbulb, title: 'MVP Development', desc: 'Rapid prototyping and minimum viable products to validate your business idea.' },
              { icon: Rocket, title: 'AI & Automation', desc: 'AI-powered features, chatbots, document processing, and intelligent workflows.' },
            ].map((s) => (
              <div key={s.title} className="group rounded-2xl border border-white/5 bg-white/[0.02] p-7 transition-all hover:border-violet-500/20 hover:bg-violet-500/[0.03]">
                <div className="mb-4 inline-flex rounded-xl bg-violet-500/10 p-3 text-violet-400 transition-colors group-hover:bg-violet-500/20">
                  <s.icon className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process / CTA */}
      <section id="process" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Our Process</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">From Idea to Launch in 4 Steps</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: '01', title: 'Discovery', desc: 'Tell us your idea through our AI-powered discovery chat.' },
              { step: '02', title: 'Blueprint', desc: 'We generate BRDs, PRDs, and technical specs automatically.' },
              { step: '03', title: 'Build', desc: 'Our engineering team brings your vision to life.' },
              { step: '04', title: 'Launch', desc: 'Deployed, tested, and handed off with full documentation.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 font-mono text-xl font-bold text-violet-400">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="border-t border-white/5 bg-[#0d0d14] py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to Build Something Great?</h2>
          <p className="mt-4 text-lg text-zinc-400">
            Share your idea through our AI-powered discovery session. We&apos;ll generate a 
            comprehensive project blueprint in minutes, not weeks.
          </p>
          <Link
            href="/auth?org=horizon-tech"
            className="group mt-8 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-10 py-4 text-lg font-semibold text-white shadow-xl shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:scale-[1.02]"
          >
            Start Your Free Discovery
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Code2 className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-400">Horizon Tech</span>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Horizon Tech. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
