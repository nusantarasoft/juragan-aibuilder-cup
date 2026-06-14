"use client";

import { motion } from "motion/react";
import { SpotlightNew } from "@/components/ui/spotlight-new";
import { FlipWords } from "@/components/ui/flip-words";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: "📊", title: "Big Data Analytics", desc: "Dremio Lakehouse with SQL Runner, VDS management, and Iceberg/Nessie integration." },
  { icon: "🤖", title: "AI Studio", desc: "Notebook RAG — intelligent document analysis, guided chat, and report generation." },
  { icon: "💼", title: "CRM Intelligence", desc: "Full-cycle CRM with contacts, deals, campaigns, AI-driven insights, and pipeline analytics." },
  { icon: "🎫", title: "ITSM & Service Desk", desc: "17-process ITIL framework: incidents, problems, changes, CMDB, SLA, and knowledge base." },
  { icon: "📈", title: "Accounting & Finance", desc: "Chart of accounts, journal entries, AR/AP, bank reconciliation, and financial reports." },
  { icon: "👥", title: "HR & People", desc: "Employee directory, attendance, payroll with PPh21 tax, recruitment, and performance tracking." },
  { icon: "🏭", title: "Inventory & Supply Chain", desc: "Item master, procurement, manufacturing, warehouses, stock opname, and fixed assets." },
  { icon: "🛒", title: "E-Commerce", desc: "Product catalog, orders, payments (Midtrans/Xendit), returns, packages, and discounts." },
  { icon: "📰", title: "News Intelligence", desc: "RSS crawler, sentiment analysis, social media monitoring, market sounding, and content publishing." },
  { icon: "🔒", title: "Audit & Compliance", desc: "Cross-module audit trails, compliance scoring, GDPR tools, and data retention policies." },
  { icon: "🐳", title: "Docker Infrastructure", desc: "Real-time container health monitoring, CPU/memory metrics, log viewer, and cluster overview." },
  { icon: "🔔", title: "Notifications Hub", desc: "Multi-channel notifications, webhook management, delivery logs, and template engine." },
  { icon: "📋", title: "Reporting Engine", desc: "Visual report builder, scheduled delivery, pre-built templates across all modules." },
  { icon: "🔌", title: "API Marketplace", desc: "Browse & install third-party integrations — payments, logistics, AI, and communication APIs." },
  { icon: "📉", title: "Log Analytics", desc: "Centralized log intelligence with error trends, SLO compliance, and Apdex scoring." },
];

const PRICING = [
  { name: "Starter", price: "Free", desc: "For small teams getting started", features: ["5 users", "CRM & Contacts", "Basic Analytics", "Email Support"], color: "from-blue-500 to-cyan-400", popular: false },
  { name: "Professional", price: "$49", desc: "For growing businesses", features: ["25 users", "All modules", "AI Studio", "Big Data", "Priority Support", "Custom Integrations"], color: "from-violet-500 to-purple-500", popular: true },
  { name: "Enterprise", price: "Custom", desc: "For large organizations", features: ["Unlimited users", "Dedicated infrastructure", "SLA guarantee", "Custom development", "24/7 Support", "On-premise option"], color: "from-orange-500 to-red-500", popular: false },
];

const STATS = [
  { value: "65+", label: "Microservices" },
  { value: "15", label: "Core Modules" },
  { value: "185+", label: "Admin Pages" },
  { value: "81", label: "PostgreSQL Extensions" },
];

const TESTIMONIALS = [
  { name: "Andi Wijaya", role: "CTO, PT Teknologi Maju", quote: "Nusantarasoft replaced 5 separate SaaS tools for us. The integration between CRM, accounting, and inventory is seamless." },
  { name: "Sari Dewi", role: "VP Operations, Garuda Logistics", quote: "The ITSM module alone saved us 40% on incident resolution time. The AI-powered knowledge base is a game changer." },
  { name: "Budi Santoso", role: "CEO, Digital Nusantara", quote: "Having Big Data analytics with Dremio built right into our admin panel means our team doesn't need separate BI tools anymore." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-[var(--font-inter)] overflow-x-hidden">
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center">
        <SpotlightNew fill="#7c3aed" />
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-white/10 bg-white/5 text-sm text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              v2.14.0 — Reporting Engine, API Marketplace & Production Hardening
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Enterprise Intelligence{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Suite
            </span>
          </motion.h1>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-neutral-400 mb-4 flex items-center justify-center gap-2 flex-wrap">
            AI-powered platform for
            <FlipWords words={["CRM", "ITSM", "Big Data", "HR", "Accounting", "E-Commerce"]} className="text-white font-semibold" />
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
            className="text-neutral-500 text-base md:text-lg max-w-2xl mx-auto mb-10">
            65+ microservices, 15 core modules, and 185+ admin pages — built for the modern Indonesian enterprise.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-4">
            <HoverBorderGradient containerClassName="rounded-full" className="flex items-center gap-2 bg-black px-6 py-3 text-white font-medium">
              <span>Get Started</span> <span>→</span>
            </HoverBorderGradient>
            <a href="http://localhost:3003/admin/dashboard" className="px-6 py-3 rounded-full border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors font-medium">
              Live Demo
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Stats Bar ────────────────────────────────────────── */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">{s.value}</div>
              <div className="text-sm text-neutral-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">run your enterprise</span></h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">15 deeply integrated modules working together as a single platform.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                className="group relative p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-violet-300 transition-colors">{f.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Trusted by <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">industry leaders</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <span key={j} className="text-yellow-400 text-sm">★</span>)}
                </div>
                <p className="text-neutral-300 text-sm leading-relaxed flex-1 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-sm">{t.name[0]}</div>
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs text-neutral-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, transparent <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">pricing</span></h2>
            <p className="text-neutral-400 text-lg">Start free, scale as you grow.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={cn("relative p-6 rounded-2xl border flex flex-col", p.popular ? "border-violet-500/50 bg-violet-500/5 scale-105" : "border-white/5 bg-white/[0.02]")}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-xs font-semibold">Most Popular</div>}
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <p className="text-neutral-500 text-sm mb-4">{p.desc}</p>
                <div className="mb-6">
                  <span className={cn("text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent", p.color)}>{p.price}</span>
                  {p.price !== "Custom" && p.price !== "Free" && <span className="text-neutral-500 text-sm">/mo per user</span>}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-neutral-300">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button className={cn("w-full py-2.5 rounded-full font-medium text-sm transition-all", p.popular ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25" : "border border-white/10 text-neutral-300 hover:bg-white/5")}>
                  {p.price === "Custom" ? "Contact Sales" : "Get Started"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Newsletter / CTA ─────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Ready to transform your <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">enterprise</span>?</h2>
            <p className="text-neutral-400 text-lg mb-8">Join our newsletter for product updates, tips, and early access to new features.</p>
            <div className="flex items-center gap-3 max-w-md mx-auto">
              <input type="email" placeholder="Enter your email" className="flex-1 px-5 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm" />
              <button className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all whitespace-nowrap">
                Subscribe
              </button>
            </div>
            <p className="text-xs text-neutral-600 mt-3">No spam, unsubscribe anytime.</p>
          </motion.div>
        </div>
      </section>

      {/* ─── Architecture Showcase ─────────────────────────── */}
      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Built on <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">battle-tested</span> open source</h2>
            <p className="text-neutral-400 text-lg">Enterprise-grade infrastructure powered by the best open source technologies.</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { name: 'PostgreSQL', tag: 'Database' }, { name: 'Supabase', tag: 'Backend' }, { name: 'Dremio', tag: 'Lakehouse' },
              { name: 'MinIO', tag: 'Storage' }, { name: 'Kong', tag: 'API Gateway' }, { name: 'Nginx', tag: 'Proxy' },
              { name: 'Docker', tag: 'Container' }, { name: 'Next.js', tag: 'Frontend' }, { name: 'NestJS', tag: 'Middleware' },
              { name: 'GraphQL', tag: 'API' }, { name: 'Nessie', tag: 'Catalog' }, { name: 'Keycloak', tag: 'SSO' },
              { name: 'Grafana', tag: 'Monitoring' }, { name: 'Prometheus', tag: 'Metrics' }, { name: 'Loki', tag: 'Logging' },
              { name: 'Vault', tag: 'Secrets' }, { name: 'K3s', tag: 'K8s' }, { name: 'Portainer', tag: 'Mgmt' },
            ].map((tech, i) => (
              <motion.div key={tech.name} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all text-center group">
                <div className="font-semibold text-sm text-white group-hover:text-violet-300 transition-colors">{tech.name}</div>
                <div className="text-[10px] text-neutral-600 mt-0.5">{tech.tag}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-bold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">Modules</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#" className="hover:text-white transition-colors">CRM</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ITSM</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Big Data</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AI Studio</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between pt-8 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-sm">N</div>
              <span className="font-semibold">Nusantarasoft</span>
            </div>
            <p className="text-sm text-neutral-600">© 2026 Nusantarasoft. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
