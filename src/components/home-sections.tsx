"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Compass,
  Eye,
  GraduationCap,
  HandHeart,
  Heart,
  Sparkles,
  Sprout,
  Target,
  Users,
} from "lucide-react";
import { siteImages } from "@/lib/site-content";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-nlqi-green text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_12%,rgba(216,173,63,0.13),transparent_34%),linear-gradient(120deg,#00331d_0%,#004d2b_58%,#075b35_100%)]" />
      <div className="absolute -right-48 top-20 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/[0.06]" />
      <div className="absolute -right-28 top-40 -z-10 h-[25rem] w-[25rem] rounded-full border border-white/[0.07]" />

      <div className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-8 px-5 pb-16 pt-32 sm:px-8 lg:min-h-[820px] lg:grid-cols-[0.88fr_1.12fr] lg:gap-10 lg:px-10 lg:pb-20 lg:pt-28">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 max-w-2xl py-8 lg:py-0"
        >
          <motion.div variants={fadeUp} className="mb-7 flex items-center gap-3">
            <span className="h-px w-10 bg-nlqi-gold" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-nlqi-gold-light">
              Nigeria Legacy Queen International
            </p>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="max-w-2xl text-[3.5rem] font-medium leading-[0.98] tracking-[-0.055em] sm:text-7xl lg:text-[5.5rem]"
          >
            A new kind
            <br />
            of <span className="font-normal italic text-nlqi-gold-light">queen.</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-7 max-w-lg text-base leading-7 text-white/75 sm:text-lg sm:leading-8"
          >
            A generation of women defined by intellect, leadership, purpose and
            lasting impact. More than a crown—it&apos;s a platform for purpose.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/apply"
              className="group inline-flex items-center gap-3 rounded-full bg-nlqi-gold px-6 py-4 text-[11px] font-bold uppercase tracking-[0.13em] text-nlqi-green transition hover:bg-nlqi-gold-light"
            >
              Begin your journey
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="#about"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.13em] text-white transition hover:border-white/60 hover:bg-white/5"
            >
              Discover NLQI
              <ArrowDownRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-14 flex items-center gap-5">
            <div className="flex -space-x-3">
              {[siteImages.queen, siteImages.leadership, siteImages.portrait].map(
                (src, index) => (
                  <span
                    key={src}
                    className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-nlqi-green"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </span>
                ),
              )}
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-white">
                Discover your purpose
              </p>
              <p className="mt-1 text-[11px] text-white/55">
                Leadership • Advocacy • Legacy
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative mx-auto w-full max-w-[650px] pb-9 pt-5 lg:ml-auto lg:pb-0 lg:pt-0"
        >
          <div className="grid grid-cols-12 grid-rows-[190px_130px_155px] gap-3 sm:grid-rows-[250px_150px_185px] sm:gap-4">
            <div className="relative col-span-8 col-start-5 row-span-2 overflow-hidden rounded-[45%_45%_12px_12px] border border-white/15 sm:rounded-[48%_48%_16px_16px]">
              <Image
                src={siteImages.queen}
                alt="Portrait celebrating the confidence and ambition of Nigerian women"
                fill
                priority
                sizes="(max-width: 1024px) 60vw, 34vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-nlqi-green/35 via-transparent to-white/5" />
            </div>
            <div className="relative col-span-5 col-start-1 row-span-2 row-start-2 overflow-hidden rounded-t-[48%] rounded-b-xl border border-white/20 shadow-2xl shadow-black/30">
              <Image
                src={siteImages.leadership}
                alt="Women sharing ideas and leading together"
                fill
                sizes="(max-width: 1024px) 42vw, 24vw"
                className="object-cover"
              />
            </div>
            <div className="relative col-span-5 col-start-8 row-start-3 overflow-hidden rounded-2xl border border-white/20 shadow-2xl shadow-black/30">
              <Image
                src={siteImages.community}
                alt="Women building stronger communities together"
                fill
                sizes="(max-width: 1024px) 42vw, 24vw"
                className="object-cover"
              />
            </div>
            <div className="col-span-3 col-start-6 row-start-3 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-nlqi-gold/60 text-nlqi-gold sm:h-20 sm:w-20">
                <Sparkles className="h-7 w-7" strokeWidth={1.2} />
              </span>
            </div>
          </div>
          <div className="absolute -left-2 top-1/2 hidden -translate-y-1/2 -rotate-90 text-[9px] font-medium uppercase tracking-[0.28em] text-white/45 sm:block">
            Purpose in every step
          </div>
          <div className="absolute -bottom-1 left-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md sm:bottom-8 sm:left-1">
            <p className="font-serif text-xl italic text-nlqi-gold-light">Mental Renaissance</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.19em] text-white/65">
              Transforming mindsets before crowns
            </p>
          </div>
          <span className="absolute right-0 top-8 hidden h-16 w-16 rounded-full border border-nlqi-gold/50 lg:block" />
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nlqi-gold/50 to-transparent" />
    </section>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-24 bg-nlqi-cream py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-24 lg:px-10">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7 }}
          className="relative mx-auto w-full max-w-[570px] pb-12 pr-10"
        >
          <div className="relative h-[420px] overflow-hidden rounded-t-[48%] rounded-b-2xl sm:h-[520px]">
            <Image
              src={siteImages.portrait}
              alt="Portrait of a confident woman and future leader"
              fill
              sizes="(max-width: 1024px) 90vw, 42vw"
              className="object-cover"
            />
          </div>
          <div className="absolute bottom-0 right-0 w-[46%] rounded-t-[44%] rounded-b-xl border-[7px] border-nlqi-cream bg-nlqi-cream">
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[44%] rounded-b-lg">
              <Image
                src={siteImages.mentorship}
                alt="Mentorship in action"
                fill
                sizes="(max-width: 1024px) 38vw, 18vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="absolute left-0 top-8 rounded-full bg-white px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-nlqi-green shadow-lg">
            Lagos, Nigeria <span className="ml-2 text-nlqi-gold">•</span> For the world
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="editorial-label">
            A crown with a cause
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-5 max-w-xl text-4xl font-medium leading-[1.08] tracking-[-0.04em] text-nlqi-green sm:text-6xl"
          >
            Beauty is a beginning.
            <span className="font-normal italic text-[#a58225]"> Purpose is the legacy.</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-7 max-w-xl text-base leading-8 text-nlqi-charcoal/70"
          >
            Nigeria Legacy Queen International is a non-profit pageant foundation
            empowering Nigerian women through leadership, intellect, advocacy and
            legacy. We believe beauty becomes powerful when purpose gives it
            direction.
          </motion.p>
          <motion.blockquote
            variants={fadeUp}
            className="mt-9 border-l-2 border-nlqi-gold pl-6 font-serif text-2xl italic leading-snug text-nlqi-green sm:text-3xl"
          >
            “More than a crown. It&apos;s a platform for purpose.”
          </motion.blockquote>
          <motion.div variants={fadeUp} className="mt-9">
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-nlqi-green hover:text-[#a58225]"
            >
              Our story <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export function MentalRenaissanceSection() {
  const pillars = [
    {
      number: "01",
      icon: Eye,
      title: "A bigger vision",
      text: "To raise women who become symbols of influence, impact and excellence across Nigeria and beyond.",
    },
    {
      number: "02",
      icon: Target,
      title: "Purposeful action",
      text: "Mentorship, advocacy and leadership development that carries forward long after the finale.",
    },
    {
      number: "03",
      icon: Brain,
      title: "Mindset first",
      text: "Transforming mindsets before crowns—centering intellect, confidence and meaningful contribution.",
    },
  ];

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="editorial-label">The Mental Renaissance</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-medium tracking-[-0.04em] text-nlqi-green sm:text-5xl">
              Transforming minds.
              <br />
              <span className="font-normal italic text-[#a58225]">Creating legacies.</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-nlqi-charcoal/65">
            We are building a platform where every woman can discover her voice,
            develop her leadership and leave a lasting mark.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-nlqi-green/10 bg-nlqi-green/10 md:grid-cols-3">
          {pillars.map((pillar) => (
            <motion.article
              key={pillar.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="group relative min-h-[270px] bg-white p-8 transition-colors hover:bg-[#fbf8ef] sm:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-2xl italic text-nlqi-gold">{pillar.number}</span>
                <pillar.icon className="h-6 w-6 text-nlqi-green/70 transition-transform group-hover:-translate-y-1" strokeWidth={1.4} />
              </div>
              <h3 className="mt-12 font-serif text-2xl text-nlqi-green">{pillar.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-nlqi-charcoal/65">{pillar.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ValuesSection() {
  const values = [
    { letter: "A", word: "Authenticity", desc: "Lead as your truest self." },
    { letter: "P", word: "Purpose", desc: "Let every platform serve a cause." },
    { letter: "P", word: "Perseverance", desc: "Turn challenge into momentum." },
    { letter: "L", word: "Leadership", desc: "Create space for others to rise." },
    { letter: "E", word: "Excellence", desc: "Bring intention to every detail." },
  ];

  return (
    <section className="relative overflow-hidden bg-nlqi-green py-20 text-white sm:py-24">
      <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full border border-white/[0.07]" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-nlqi-gold-light">The APPLE values</p>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">What we stand for</h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-white/65">
            Five principles, one promise: to grow women who lead with purpose and
            leave people and places better than they found them.
          </p>
        </div>
        <div className="grid overflow-hidden rounded-2xl border border-white/15 sm:grid-cols-2 lg:grid-cols-5">
          {values.map((value, index) => (
            <motion.article
              key={value.word}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              className="group min-h-[205px] border-b border-white/15 p-6 transition-colors hover:bg-white/[0.07] sm:p-7 lg:border-b-0 lg:border-r lg:last:border-r-0"
            >
              <span className="font-serif text-6xl italic leading-none text-nlqi-gold-light transition-transform group-hover:translate-x-1">
                {value.letter}
              </span>
              <h3 className="mt-7 text-sm font-semibold tracking-wide">{value.word}</h3>
              <p className="mt-2 text-xs leading-5 text-white/60">{value.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const stats = [
    { value: "1,000+", label: "Future leaders" },
    { value: "36", label: "States represented" },
    { value: "200+", label: "Community projects" },
    { value: "100%", label: "Purpose driven" },
  ];

  return (
    <section id="impact" className="scroll-mt-24 bg-nlqi-cream py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="editorial-label">Legacy in motion</p>
            <h2 className="mt-4 max-w-md text-4xl font-medium tracking-[-0.04em] text-nlqi-green sm:text-5xl">
              Ambition with a ripple effect.
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-9 border-t border-nlqi-green/20 pt-8 sm:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <p className="font-serif text-4xl text-nlqi-green sm:text-5xl">{stat.value}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase leading-5 tracking-[0.13em] text-nlqi-charcoal/55">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
        <p className="mt-8 text-[10px] leading-5 text-nlqi-charcoal/45">
          Aspirational programme targets. Replace with verified programme reporting before publication.
        </p>
      </div>
    </section>
  );
}

export function AdvocacySection() {
  const areas = [
    { title: "Education", icon: GraduationCap, image: siteImages.education, note: "Open doors through learning" },
    { title: "Mental wellbeing", icon: Heart, image: siteImages.portrait, note: "Make care part of the conversation" },
    { title: "Women’s opportunity", icon: Users, image: siteImages.leadership, note: "Back women to shape what comes next" },
    { title: "Youth development", icon: Sprout, image: siteImages.mentorship, note: "Invest in the next generation" },
    { title: "Community service", icon: HandHeart, image: siteImages.community, note: "Turn compassion into action" },
    { title: "Leadership", icon: Compass, image: siteImages.conversation, note: "Lead with clarity and care" },
  ];

  return (
    <section className="bg-[#f7f5ed] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="editorial-label">The causes we champion</p>
            <h2 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-nlqi-green sm:text-5xl">
              Purpose made visible.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-nlqi-charcoal/65">
            Every contestant is encouraged to bring a personal cause to life
            through thoughtful, community-led action.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area, index) => (
            <motion.article
              key={area.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: (index % 3) * 0.07 }}
              className={`group relative min-h-[330px] overflow-hidden rounded-2xl bg-nlqi-green ${
                index === 0 || index === 5 ? "lg:min-h-[380px]" : ""
              }`}
            >
              <Image
                src={area.image}
                alt={area.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002d19]/95 via-[#002d19]/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <area.icon className="mb-5 h-6 w-6 text-nlqi-gold-light" strokeWidth={1.4} />
                <h3 className="font-serif text-2xl text-white">{area.title}</h3>
                <p className="mt-2 text-xs text-white/70">{area.note}</p>
              </div>
              <span className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/35 text-white opacity-0 transition group-hover:opacity-100">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function JourneySection() {
  const steps = [
    "Application",
    "Screening",
    "Shortlisting",
    "Training camp",
    "Advocacy",
    "Grand finale",
    "Legacy leadership",
  ];

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="mb-12 max-w-2xl">
          <p className="editorial-label">Your next chapter</p>
          <h2 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-nlqi-green sm:text-5xl">
            The journey is the crown.
          </h2>
          <p className="mt-4 text-sm leading-7 text-nlqi-charcoal/65">
            A considered path from first application to a lifetime of leadership.
          </p>
        </div>
        <div className="relative grid gap-7 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <div className="absolute left-0 right-0 top-[17px] hidden h-px bg-nlqi-green/15 lg:block" />
          {steps.map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="relative"
            >
              <span className="relative z-10 flex h-[35px] w-[35px] items-center justify-center rounded-full border border-nlqi-gold bg-white font-serif text-sm text-nlqi-green">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 max-w-[120px] text-sm font-semibold leading-5 text-nlqi-green">{step}</h3>
              <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.13em] text-nlqi-charcoal/45">
                Chapter {String(index + 1).padStart(2, "0")}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SponsorsSection() {
  const partnerTypes = ["Education", "Wellbeing", "Enterprise", "Community", "Culture"];
  return (
    <section className="border-y border-nlqi-green/10 bg-nlqi-cream py-12">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[190px] text-[10px] font-bold uppercase leading-5 tracking-[0.15em] text-nlqi-charcoal/50">
            A platform strengthened by partnership
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {partnerTypes.map((type) => (
              <span key={type} className="font-serif text-lg text-nlqi-green/65 sm:text-xl">
                {type}
              </span>
            ))}
          </div>
          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-nlqi-green"
          >
            Partner with us <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ApplyCTA() {
  return (
    <section className="relative isolate overflow-hidden bg-nlqi-green py-20 text-white sm:py-28">
      <Image
        src={siteImages.conversation}
        alt=""
        fill
        sizes="100vw"
        className="-z-20 object-cover opacity-20"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#00331d]/95 via-[#00331d]/85 to-[#00331d]/55" />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-10">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-nlqi-gold-light">Your moment starts here</p>
          <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-6xl">
            Ready to make your
            <br />
            purpose your <span className="italic text-nlqi-gold-light">platform?</span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/70">
            Bring your ideas, your ambition and your story. Your legacy can start
            with one small step.
          </p>
        </div>
        <Link
          href="/apply"
          className="group inline-flex shrink-0 items-center gap-4 self-start rounded-full bg-nlqi-gold px-7 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-nlqi-green transition hover:bg-nlqi-gold-light md:self-auto"
        >
          Start your application
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
